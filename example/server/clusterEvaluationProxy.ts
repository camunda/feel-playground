import { readFile } from 'node:fs/promises';
import type {
  IncomingMessage,
  ServerResponse
} from 'node:http';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';

import type {
  EvaluationInput,
  EvaluationResult,
  EvaluationWarning
} from '../../src/core';

const CONFIG_PATH = resolve('cluster.config.json');
const MAX_REQUEST_SIZE = 1024 * 1024;

interface NoAuth {
  type: 'none';
}

interface BasicAuth {
  type: 'basic';
  username?: string;
  usernameEnv?: string;
  password?: string;
  passwordEnv?: string;
}

interface BearerAuth {
  type: 'bearer';
  token?: string;
  tokenEnv?: string;
}

interface OAuthAuth {
  type: 'oauth';
  tokenUrl: string;
  clientId?: string;
  clientIdEnv?: string;
  clientSecret?: string;
  clientSecretEnv?: string;
  audience?: string;
  scope?: string;
}

type ClusterAuth = NoAuth | BasicAuth | BearerAuth | OAuthAuth;

interface ClusterConfig {
  baseUrl: string;
  tenantId?: string | null;
  auth?: ClusterAuth;
}

interface ClusterResponse {
  result?: unknown;
  warnings?: EvaluationWarning[];
  message?: string;
  detail?: string;
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

let cachedToken: CachedToken | null = null;

export function clusterEvaluationProxy(): Plugin {
  return {
    name: 'cluster-evaluation-proxy',
    configureServer(server) {
      server.middlewares.use('/api/evaluate', async (request, response, next) => {
        if (request.method !== 'POST') {
          next();
          return;
        }

        try {
          const config = await readClusterConfig();
          const input = await readJsonBody(request);
          const result = await evaluateOnCluster(config, input);

          sendJson(response, 200, result);
        } catch (error) {
          const status = error instanceof HttpError ? error.status : 500;
          const message = error instanceof Error ? error.message : 'Evaluation failed';

          sendJson(response, status, { message });
        }
      });
    }
  };
}

async function readClusterConfig(): Promise<ClusterConfig> {
  let contents: string;

  try {
    contents = await readFile(CONFIG_PATH, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new HttpError(
        'Missing cluster.config.json. Create it from cluster.config.example.json.',
        503
      );
    }

    throw error;
  }

  const config: unknown = JSON.parse(contents);

  if (!config || typeof config !== 'object' || !('baseUrl' in config) || typeof config.baseUrl !== 'string') {
    throw new HttpError('cluster.config.json must define baseUrl.', 503);
  }

  return config as ClusterConfig;
}

async function evaluateOnCluster(config: ClusterConfig, input: EvaluationInput): Promise<EvaluationResult> {
  if (!input.expression || typeof input.expression !== 'string') {
    throw new HttpError('expression must be a non-empty string.', 400);
  }

  const endpoint = `${config.baseUrl.replace(/\/v2\/?$/, '').replace(/\/$/, '')}/v2/expression/evaluation`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...await createAuthHeaders(config.auth || { type: 'none' })
  };
  const payload: {
    expression: string;
    variables: Record<string, unknown>;
    tenantId?: string;
  } = {
    expression: input.expression,
    variables: input.context
  };

  if (config.tenantId) {
    payload.tenantId = config.tenantId;
  }

  const clusterResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const body = await readResponseBody(clusterResponse);

  if (!clusterResponse.ok) {
    throw new HttpError(
      body.message || body.detail || `Cluster returned HTTP ${clusterResponse.status}.`,
      clusterResponse.status
    );
  }

  if (!('result' in body)) {
    throw new HttpError('Cluster response does not contain a result.', 502);
  }

  return {
    result: body.result,
    warnings: body.warnings ?? []
  };
}

async function createAuthHeaders(auth: ClusterAuth): Promise<Record<string, string>> {
  switch (auth.type) {
  case 'none':
    return {};
  case 'basic': {
    const username = readConfiguredValue(auth.username, auth.usernameEnv);
    const password = readConfiguredValue(auth.password, auth.passwordEnv);
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    return { Authorization: `Basic ${credentials}` };
  }
  case 'bearer':
    return {
      Authorization: `Bearer ${readConfiguredValue(auth.token, auth.tokenEnv)}`
    };
  case 'oauth':
    return {
      Authorization: `Bearer ${await getOAuthToken(auth)}`
    };
  }
}

async function getOAuthToken(auth: OAuthAuth): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId = readConfiguredValue(auth.clientId, auth.clientIdEnv);
  const clientSecret = readConfiguredValue(auth.clientSecret, auth.clientSecretEnv);
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  if (auth.audience) {
    form.set('audience', auth.audience);
  }

  if (auth.scope) {
    form.set('scope', auth.scope);
  }

  const tokenResponse = await fetch(auth.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });
  const body = await readResponseBody(tokenResponse);

  if (!tokenResponse.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || 'OAuth token request failed.');
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max((body.expires_in || 300) - 30, 1) * 1000
  };

  return cachedToken.value;
}

function readConfiguredValue(value?: string, environmentVariable?: string): string {
  const resolved = environmentVariable ? process.env[environmentVariable] : value;

  if (!resolved) {
    throw new Error(`Missing configured value${environmentVariable ? ` in ${environmentVariable}` : ''}.`);
  }

  return resolved;
}

function readJsonBody(request: IncomingMessage): Promise<EvaluationInput> {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;

      if (body.length > MAX_REQUEST_SIZE) {
        rejectBody(new HttpError('Request is too large.', 413));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body || '{}') as EvaluationInput);
      } catch {
        rejectBody(new HttpError('Request body must be valid JSON.', 400));
      }
    });
    request.on('error', rejectBody);
  });
}

async function readResponseBody(response: Response): Promise<ClusterResponse> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as ClusterResponse;
  } catch {
    return { message: text };
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
