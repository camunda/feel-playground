import type {
  EvaluationWarning,
  PlaygroundState
} from '../core';

interface ResultViewProps {
  state: PlaygroundState;
}

export function ResultView({ state }: ResultViewProps) {
  return (
    <section className="feel-playground__section feel-playground__result" aria-live="polite">
      <div className="feel-playground__section-heading">
        <h3>Result</h3>
        <Status status={state.status} />
      </div>

      <div className="feel-playground__result-body">
        {state.status === 'warning' && (
          <div className="feel-playground__warnings">
            {state.warnings.map((warning, index) => (
              <p key={index}>{formatWarning(warning)}</p>
            ))}
          </div>
        )}
        <Result state={state} />
      </div>
    </section>
  );
}

function Result({ state }: ResultViewProps) {
  switch (state.status) {
    case 'idle':
      return <p>Enter an expression to evaluate.</p>;
    case 'invalid-context':
      return null;
    case 'scheduled':
      return <p>Waiting for input to settle…</p>;
    case 'loading':
      return <p>Evaluating on the configured cluster…</p>;
    case 'unavailable':
      return <p className="feel-playground__message is-warning">{state.message}</p>;
    case 'error':
      return (
        <div className="feel-playground__errors">
          <p>{state.error}</p>
        </div>
      );
    case 'success':
    case 'warning':
      return <pre>{formatResult(state.result)}</pre>;
  }
}

function Status({ status }: { status: PlaygroundState['status'] }) {
  if (['idle', 'invalid-context', 'scheduled'].includes(status)) {
    return null;
  }

  return <span className={`feel-playground__status is-${status}`}>{status}</span>;
}

function formatResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  const serialized = JSON.stringify(result, null, 2);

  return typeof serialized === 'undefined' ? String(result) : serialized;
}

function formatWarning(warning: EvaluationWarning): string {
  return warning.message;
}
