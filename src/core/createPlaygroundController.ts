import { parseContext } from './parseContext';
import type {
  PlaygroundController,
  PlaygroundControllerOptions,
  PlaygroundInput,
  PlaygroundState
} from './types';

const INITIAL_STATE: PlaygroundState = { status: 'idle' };
const INITIAL_INPUT: PlaygroundInput = {
  expression: '',
  expressionValid: true,
  context: '',
  dialect: 'expression'
};

export function createPlaygroundController(
  { debounce = 300 }: PlaygroundControllerOptions = {}
): PlaygroundController {
  let state: PlaygroundState = INITIAL_STATE;
  let input: PlaygroundInput = INITIAL_INPUT;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let request: AbortController | null = null;
  let revision = 0;
  const listeners = new Set<(state: PlaygroundState) => void>();

  function getState(): PlaygroundState {
    return state;
  }

  function subscribe(listener: (state: PlaygroundState) => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  function update(nextInput: PlaygroundInput): void {
    if (isSameInput(input, nextInput)) {
      return;
    }

    input = nextInput;
    schedule();
  }

  function schedule(): void {
    cancelPending();

    const expression = input.expression.trim();
    let context;

    try {
      context = parseContext(input.context);
    } catch (error) {
      setState({
        status: 'invalid-context',
        error: getErrorMessage(error, 'Context must be valid JSON.')
      });
      return;
    }

    if (!expression) {
      setState(INITIAL_STATE);
      return;
    }

    if (input.expressionValid === null) {
      setState({ status: 'validating-expression' });
      return;
    }

    if (input.expressionValid === false) {
      setState({ status: 'invalid-expression' });
      return;
    }

    if (!input.onEvaluate) {
      setState({
        status: 'unavailable',
        message: input.evaluationUnavailable || 'Evaluation is unavailable.'
      });
      return;
    }

    setState({ status: 'scheduled' });

    const scheduledRevision = revision;
    timer = setTimeout(() => runEvaluation(expression, context, scheduledRevision), debounce);
  }

  async function runEvaluation(
    expression: string,
    context: Record<string, unknown>,
    scheduledRevision: number
  ): Promise<void> {
    timer = null;

    if (scheduledRevision !== revision || !input.onEvaluate) {
      return;
    }

    const evaluate = input.onEvaluate;
    const controller = new AbortController();
    request = controller;

    setState({ status: 'loading' });

    try {
      const result = await evaluate(
        { expression, context, dialect: input.dialect },
        { signal: controller.signal }
      );

      if (controller.signal.aborted || scheduledRevision !== revision) {
        return;
      }

      setState(result.warnings.length
        ? { status: 'warning', result: result.result, warnings: result.warnings }
        : { status: 'success', result: result.result }
      );
    } catch (error) {
      if (controller.signal.aborted || scheduledRevision !== revision) {
        return;
      }

      setState({
        status: 'error',
        error: getErrorMessage(error, 'Evaluation failed.')
      });
    } finally {
      if (request === controller) {
        request = null;
      }
    }
  }

  function cancelPending(): void {
    revision += 1;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (request) {
      request.abort();
      request = null;
    }
  }

  function dispose(): void {
    cancelPending();
    listeners.clear();
  }

  function setState(nextState: PlaygroundState): void {
    state = nextState;
    listeners.forEach(listener => listener(state));
  }

  return {
    dispose,
    getState,
    subscribe,
    update
  };
}

function isSameInput(current: PlaygroundInput, next: PlaygroundInput): boolean {
  return current.expression === next.expression
    && current.expressionValid === next.expressionValid
    && current.context === next.context
    && current.dialect === next.dialect
    && current.onEvaluate === next.onEvaluate
    && current.evaluationUnavailable === next.evaluationUnavailable;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
