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
    return <StatusIcon status="error" />;
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
    return (
      <p>
        <strong>Error:</strong> {warning.message}
      </p>
    );
  }

  const message = warning.message.replace(new RegExp(`^${type}:\\s*`, 'i'), '');

  return (
    <p>
      <strong>{type}:</strong>{message && ` ${message}`}
    </p>
  );
}

const WARNING_TYPES = {
  UNKNOWN: 'Unknown',
  NO_VARIABLE_FOUND: 'No Variable Found',
  NO_CONTEXT_ENTRY_FOUND: 'No Context Entry Found',
  NO_PROPERTY_FOUND: 'No Property Found',
  NOT_COMPARABLE: 'Not Comparable',
  INVALID_TYPE: 'Invalid Type',
  NO_FUNCTION_FOUND: 'No Function Found',
  FUNCTION_INVOCATION_FAILURE: 'Function Invocation Failure',
  ASSERT_FAILURE: 'Assert Failure'
} as const;

type WarningType = typeof WARNING_TYPES[keyof typeof WARNING_TYPES];

function getWarningType(warning: EvaluationWarning): WarningType | undefined {
  const type = warning.type?.trim().toUpperCase() as keyof typeof WARNING_TYPES | undefined;

  if (type && type in WARNING_TYPES) {
    return WARNING_TYPES[type];
  }

  if (/^no variable found\b/i.test(warning.message)) {
    return 'No Variable Found';
  }

  if (/^no context entry found\b/i.test(warning.message)) {
    return 'No Context Entry Found';
  }

  if (/^no property found\b/i.test(warning.message)) {
    return 'No Property Found';
  }

  if (/^can't compare\b/i.test(warning.message)) {
    return 'Not Comparable';
  }

  if (/^(invalid type:|can't (?:add|subtract|multiply|divide)\b|expected .+ but found\b|invalid range definition\b)/i.test(warning.message)) {
    return 'Invalid Type';
  }

  if (/^no function found\b/i.test(warning.message)) {
    return 'No Function Found';
  }

  if (/^failed to (?:invoke function|load class|get method|invoke method)\b/i.test(warning.message)) {
    return 'Function Invocation Failure';
  }

  if (/^(the condition is not fulfilled|assert(?:ion)? failed\b)/i.test(warning.message)) {
    return 'Assert Failure';
  }

  if (/^unsupported expression\b/i.test(warning.message)) {
    return 'Unknown';
  }
}
