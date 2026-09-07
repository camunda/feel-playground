import type {
  EvaluationWarning,
  PlaygroundState
} from '../core/types';
import { Skeleton } from '@camunda/design-system';
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
  const evaluationWarnings = state.status === 'warning'
    ? state.warnings.map(toWarningDiagnostic)
    : [];
  const diagnostics = [ ...expressionErrors, ...evaluationWarnings ];

  return (
    <section className="feel-playground__section feel-playground__result" aria-live="polite">
      <div className="feel-playground__section-heading">
        <h3>Result</h3>
        <Status status={ state.status } />
      </div>

      <div className="feel-playground__result-body">
        <Result state={ state } expressionErrors={ expressionErrors } />
      </div>

      <DiagnosticList
        diagnostics={ diagnostics }
        label="Expression diagnostics"
        value={ expression }
        onSelect={ onSelectExpressionError }
      />

      <p className="feel-playground__pane-hint">
        Evaluates on the connected Camunda instance when the expression changes.
      </p>
    </section>
  );
}

function Result({ state, expressionErrors = [] }: ResultViewProps) {
  switch (state.status) {
  case 'idle':
    return (
      <div className="feel-playground__result-empty">
        Write an expression to see the result
      </div>
    );
  case 'validating-expression':
    return <LoadingResult state={ state } />;
  case 'invalid-expression':
    return <ResultMessage>Fix the errors in your FEEL expression to evaluate it.</ResultMessage>;
  case 'invalid-context':
    return expressionErrors.length
      ? <ResultMessage>Fix the errors in your FEEL expression to evaluate it.</ResultMessage>
      : <ResultMessage>Fix the errors in your context to evaluate the expression.</ResultMessage>;
  case 'scheduled':
  case 'loading':
    return <LoadingResult state={ state } />;
  case 'unavailable':
    return <ResultMessage>{state.message}</ResultMessage>;
  case 'error':
    return <ResultMessage>{state.error}</ResultMessage>;
  case 'success':
  case 'warning':
    return <ResultEditor value={ formatResult(state.result) } />;
  }
}

function ResultMessage({ children }: { children: React.ReactNode }) {
  return <div className="feel-playground__result-empty">{children}</div>;
}

function LoadingResult({ state }: { state: Extract<PlaygroundState, { status: 'validating-expression' | 'scheduled' | 'loading' }> }) {
  if ('previousResult' in state) {
    return (
      <div className="feel-playground__result-previous">
        <ResultEditor value={ formatResult(state.previousResult) } />
      </div>
    );
  }

  return (
    <div className="feel-playground__result-skeleton" aria-label="Loading result" role="status">
      <Skeleton className="feel-playground__result-skeleton-line" />
      <Skeleton className="feel-playground__result-skeleton-line feel-playground__result-skeleton-line--value" />
      <Skeleton className="feel-playground__result-skeleton-line" />
    </div>
  );
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

export function toWarningDiagnostic(warning: EvaluationWarning): PlaygroundDiagnostic {
  const type = getWarningType(warning);
  const position = warning.position;

  if (!type) {
    return {
      from: position?.from || 0,
      to: position?.to || position?.from || 0,
      message: warning.message,
      severity: 'warning',
      showPosition: Boolean(position),
      source: 'Error'
    };
  }

  const message = warning.message.replace(new RegExp(`^${type}:\\s*`, 'i'), '');

  return {
    from: position?.from || 0,
    to: position?.to || position?.from || 0,
    message,
    severity: 'warning',
    showPosition: Boolean(position),
    source: type
  };
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
