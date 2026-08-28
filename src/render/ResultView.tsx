import type {
  EvaluationWarning,
  PlaygroundState
} from '../core';
import { StatusIcon } from './StatusIcon';

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
              <Warning key={index} warning={warning} />
            ))}
          </div>
        )}
        <Result state={state} />
      </div>

      <p className="feel-playground__pane-hint">
        Updates when the expression or context changes.
      </p>
    </section>
  );
}

function Result({ state }: ResultViewProps) {
  switch (state.status) {
    case 'idle':
      return <p>Enter an expression to evaluate.</p>;
    case 'validating-expression':
    case 'invalid-expression':
    case 'invalid-context':
      return <p>Enter a valid FEEL expression and context to evaluate.</p>;
    case 'scheduled':
    case 'loading':
      return <p>Evaluating on the configured cluster…</p>;
    case 'unavailable':
      return <p>{state.message}</p>;
    case 'error':
      return <p>{state.error}</p>;
    case 'success':
    case 'warning':
      return <pre>{formatResult(state.result)}</pre>;
  }
}

function Status({ status }: { status: PlaygroundState['status'] }) {
  switch (status) {
    case 'idle':
    case 'validating-expression':
    case 'invalid-expression':
    case 'invalid-context':
    case 'scheduled':
    case 'loading':
      return null;
    case 'unavailable':
      return <StatusIcon status="warning" />;
    case 'success':
    case 'warning':
    case 'error':
      return <StatusIcon status={status} />;
  }
}

function formatResult(result: unknown): string {
  if (typeof result === 'string') {
    return result;
  }

  const serialized = JSON.stringify(result, null, 2);

  return typeof serialized === 'undefined' ? String(result) : serialized;
}

function Warning({ warning }: { warning: EvaluationWarning }) {
  const type = getWarningType(warning);

  if (!type) {
    return <p>{warning.message}</p>;
  }

  const message = warning.message.replace(new RegExp(`^${type}:\\s*`, 'i'), '');

  return (
    <p>
      <strong>{type}:</strong>{message && ` ${message}`}
    </p>
  );
}

function getWarningType(warning: EvaluationWarning): 'No Variable Found' | 'Invalid Type' | undefined {
  const type = warning.type?.toLowerCase().replaceAll('_', ' ');

  if (type === 'no variable found' || /^no variable found\b/i.test(warning.message)) {
    return 'No Variable Found';
  }

  if (type === 'invalid type' || /^(invalid type:|can't add\b)/i.test(warning.message)) {
    return 'Invalid Type';
  }
}
