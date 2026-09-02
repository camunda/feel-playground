import type {
  Evaluate,
  EvaluationResult
} from '../src';

export const evaluateOnConfiguredCluster: Evaluate = async (input, { signal }) => {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...input,
      expression: `=${input.expression.replace(/^=/, '')}`
    }),
    signal
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(body) || `Evaluation failed with HTTP ${response.status}.`);
  }

  if (!isEvaluationResult(body)) {
    throw new Error('Evaluation response does not contain a result.');
  }

  return body;
};

function isEvaluationResult(value: unknown): value is EvaluationResult {
  return value !== null
    && typeof value === 'object'
    && 'result' in value
    && 'warnings' in value
    && Array.isArray(value.warnings);
}

function getErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('message' in value)) {
    return undefined;
  }

  return typeof value.message === 'string' ? value.message : undefined;
}
