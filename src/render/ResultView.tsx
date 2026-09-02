import type {
  EvaluationWarning,
  PlaygroundState
} from '../core/types';
import {
  DiagnosticList,
  type PlaygroundDiagnostic
} from './DiagnosticList';
import { ResultEditor } from './ResultEditor';
import { StatusIcon } from './StatusIcon';

interface ResultViewProps {
  state: PlaygroundState;
  expression?: string;
  expressionErrors?: PlaygroundDiagnostic[];
  onSelectExpressionError?(position: number): void;
}

export function ResultView({
  state,
  expression = '',
  expressionErrors = [],
  onSelectExpressionError
}: ResultViewProps) {
  return (
    <section className="feel-playground__section feel-playground__result" aria-live="polite">
      <div className="feel-playground__section-heading">
        <h3>Result</h3>
        <Status status={ state.status } />
      </div>

      <div className="feel-playground__result-body">
        {state.status === 'warning' && (
          <div className="feel-playground__warnings">
            {state.warnings.map((warning, index) => (
              <Warning key={ index } warning={ warning } />
            ))}
          </div>
        )}
        <Result state={ state } expressionErrors={ expressionErrors } />
      </div>

      <DiagnosticList
        diagnostics={ expressionErrors }
        label="Expression errors"
        value={ expression }
        onSelect={ onSelectExpressionError }
      />

      <p className="feel-playground__pane-hint">
        Updates when the expression or context changes.
      </p>
    </section>
  );
}

function Result({ state, expressionErrors = [] }: ResultViewProps) {
  switch (state.status) {
  case 'idle':
    return <p>Enter an expression to evaluate.</p>;
  case 'validating-expression':
    return <p>Evaluating…</p>;
  case 'invalid-expression':
    return <p>Fix the errors in your FEEL expression to evaluate it.</p>;
  case 'invalid-context':
    return expressionErrors.length
      ? <p>Fix the errors in your FEEL expression to evaluate it.</p>
      : <p>Fix the errors in your context to evaluate the expression.</p>;
  case 'scheduled':
  case 'loading':
    return <p>Evaluating…</p>;
  case 'unavailable':
    return <p>{state.message}</p>;
  case 'error':
    return <p>{state.error}</p>;
  case 'success':
  case 'warning':
    return <ResultEditor value={ formatResult(state.result) } />;
  }
}

function Status({ status }: { status: PlaygroundState['status'] }) {
  switch (status) {
  case 'idle':
  case 'invalid-expression':
  case 'invalid-context':
    return null;
  case 'validating-expression':
  case 'scheduled':
  case 'loading':
    return <StatusIcon status="loading" />;
  case 'unavailable':
    return <StatusIcon status="warning" />;
  case 'success':
  case 'warning':
  case 'error':
    return <StatusIcon status={ status } />;
  }
}

export function formatResult(result: unknown): string {
  const serialized = JSON.stringify(result, null, 2);

  return typeof serialized === 'undefined' ? String(result) : serialized;
}

export function Warning({ warning }: { warning: EvaluationWarning }) {
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
