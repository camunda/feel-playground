import type { Diagnostic } from '@codemirror/lint';

import { StatusIcon } from './StatusIcon';

export interface PlaygroundDiagnostic extends Diagnostic {
  type?: string;
  showPosition?: boolean;
}

interface DiagnosticListProps {
  diagnostics: PlaygroundDiagnostic[];
  label: string;
  onSelect?(position: number): void;
  value: string;
}

export function DiagnosticList({
  diagnostics,
  label,
  onSelect,
  value
}: DiagnosticListProps) {
  if (!diagnostics.length) {
    return null;
  }

  return (
    <div className="feel-playground__diagnostics" aria-label={ label }>
      {diagnostics.map((diagnostic, index) => {
        const position = getPosition(value, diagnostic.from);
        const showPosition = diagnostic.showPosition !== false;
        const content = (
          <>
            <StatusIcon status={ diagnostic.severity === 'warning' ? 'warning' : 'error' } />
            {showPosition && (
              <span className="feel-playground__diagnostic-position">
                {position.line}:{position.column}
              </span>
            )}
            <span className="feel-playground__diagnostic-message">
              <strong>{getDiagnosticLabel(diagnostic)}</strong>{' '}
              {diagnostic.message}
            </span>
          </>
        );

        if (!showPosition) {
          return (
            <div
              className="feel-playground__diagnostic feel-playground__diagnostic--without-position"
              key={ `${diagnostic.from}-${diagnostic.to}-${index}` }
            >
              {content}
            </div>
          );
        }

        return (
          <button
            className="feel-playground__diagnostic feel-playground__diagnostic--action"
            key={ `${diagnostic.from}-${diagnostic.to}-${index}` }
            type="button"
            onClick={ () => onSelect?.(diagnostic.from) }
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function getPosition(value: string, offset: number) {
  const valueBeforeError = value.slice(0, Math.max(0, offset));
  const lineStart = valueBeforeError.lastIndexOf('\n');

  return {
    line: valueBeforeError.split('\n').length,
    column: valueBeforeError.length - lineStart
  };
}

function getDiagnosticLabel(diagnostic: PlaygroundDiagnostic) {
  if (diagnostic.type === 'Syntax Error') {
    return 'Syntax error.';
  }

  return diagnostic.source ? `${diagnostic.source}.` : 'Error.';
}