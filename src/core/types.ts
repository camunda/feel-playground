export type EvaluationContext = Record<string, unknown>;

export type FeelDialect = 'expression' | 'unaryTests';

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
  warnings?: EvaluationWarning[];
}

export type Evaluate = (
  input: EvaluationInput,
  options: { signal: AbortSignal }
) => Promise<EvaluationResult>;

export interface PlaygroundInput {
  expression: string;
  expressionValid?: boolean | null;
  context: string;
  dialect: FeelDialect;
  onEvaluate?: Evaluate;
  evaluationUnavailable?: string;
}

export type PlaygroundState =
  | { status: 'idle' }
  | { status: 'validating-expression' }
  | { status: 'invalid-expression' }
  | { status: 'invalid-context'; error: string }
  | { status: 'unavailable'; message: string }
  | { status: 'scheduled' }
  | { status: 'loading' }
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
