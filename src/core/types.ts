export type EvaluationContext = Record<string, unknown>;

export type FeelDialect = 'expression' | 'unaryTests';

export type FeelEngines = Record<string, string>;

export interface FeelVariable {
  name: string;
  detail?: string;
  info?: string;
  isList?: boolean | 'optional';
  entries?: FeelVariable[];
}

export interface FeelBuiltin {
  name: string;
  type?: 'function';
  params?: Array<{ name: string }>;
  info?: string;
}

export interface FeelLanguageContext {
  builtins?: FeelBuiltin[];
  reservedNameBuiltins?: FeelBuiltin[];
  dialect?: FeelDialect;
  parserDialect?: 'camunda';
  engines?: FeelEngines;
}

export interface EvaluationWarning {
  type?: string;
  message: string;
  position?: {
    from: number;
    to: number;
  };
}

export interface EvaluationInput {
  expression: string;
  context: EvaluationContext;
  dialect: FeelDialect;
}

export interface EvaluationResult {
  result: unknown;
  warnings: EvaluationWarning[];
}

export type Evaluate = (
  input: EvaluationInput,
  options: { signal: AbortSignal }
) => Promise<EvaluationResult>;

/**
 * Host-provided explanation shown when no evaluator is available.
 * The action is optional and renders after the message.
 */
export interface EvaluationUnavailable {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick(): void;
  };
}

export interface PlaygroundInput {
  expression: string;
  expressionValid?: boolean | null;
  context: string;
  dialect: FeelDialect;
  onEvaluate?: Evaluate;
  evaluationUnavailable?: string | EvaluationUnavailable;
}

export type PlaygroundState =
  | { status: 'idle' }
  | { status: 'validating-expression'; previousResult?: unknown }
  | { status: 'invalid-expression' }
  | { status: 'invalid-context'; error: string }
  | { status: 'unavailable'; message: string; title?: string; action?: EvaluationUnavailable['action'] }
  | { status: 'scheduled'; previousResult?: unknown }
  | { status: 'loading'; previousResult?: unknown }
  | { status: 'success'; result: unknown }
  | { status: 'warning'; result: unknown; warnings: EvaluationWarning[] }
  | { status: 'error'; error: string };

export interface PlaygroundControllerOptions {
  debounce?: number;
}

export interface PlaygroundController {
  dispose(): void;
  getState(): PlaygroundState;
  subscribe(listener: (state: PlaygroundState) => void): () => void;
  update(input: PlaygroundInput): void;
}
