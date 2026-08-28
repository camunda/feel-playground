import { useEffect, useRef, useState } from 'react';

import {
  createPlaygroundController,
  type Evaluate,
  type FeelDialect,
  type PlaygroundController,
  type PlaygroundState
} from '../core';
import { ContextEditor } from './ContextEditor';
import {
  ExpressionEditor,
  type FeelLintReport,
  type FeelVariable
} from './ExpressionEditor';
import { ResultView } from './ResultView';
import { StatusIcon } from './StatusIcon';

const EVALUATION_DEBOUNCE = 300;

/**
 * Controlled FEEL playground. The host owns expression and context persistence
 * and injects the evaluator implementation.
 */
export interface FeelPlaygroundProps {
  expression: string;
  onExpressionChange(expression: string): void;
  context: string;
  onContextChange(context: string): void;
  dialect: FeelDialect;
  variables?: FeelVariable[];
  onEvaluate?: Evaluate;
  evaluationUnavailable?: string;
}

export function FeelPlayground({
  expression,
  onExpressionChange,
  context,
  onContextChange,
  dialect,
  variables = [],
  onEvaluate,
  evaluationUnavailable
}: FeelPlaygroundProps) {
  const controllerRef = useRef<PlaygroundController | null>(null);
  const [state, setState] = useState<PlaygroundState>({ status: 'idle' });
  const [expressionValid, setExpressionValid] = useState<boolean | null>(null);
  const [expressionErrors, setExpressionErrors] = useState<FeelLintReport[]>([]);

  const handleExpressionChange = (nextExpression: string) => {
    setExpressionValid(null);
    setExpressionErrors([]);
    onExpressionChange(nextExpression);
  };

  useEffect(() => {
    const controller = createPlaygroundController({ debounce: EVALUATION_DEBOUNCE });
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setState);

    return () => {
      controllerRef.current = null;
      unsubscribe();
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update({
      expression,
      expressionValid,
      context,
      dialect,
      onEvaluate,
      evaluationUnavailable
    });
  }, [expression, expressionValid, context, dialect, onEvaluate, evaluationUnavailable]);

  return (
    <div className="feel-playground">
      <section className="feel-playground__section feel-playground__expression">
        <div className="feel-playground__section-heading">
          <h3>{dialect === 'unaryTests' ? 'Unary tests' : 'FEEL expression'}</h3>
          {expressionErrors.length > 0 && (
            <span className="feel-playground__error-count">
              <StatusIcon status="error" />
              {expressionErrors.length}
            </span>
          )}
        </div>
        <ExpressionEditor
          value={expression}
          onChange={handleExpressionChange}
          onValidityChange={setExpressionValid}
          onErrorsChange={setExpressionErrors}
          errors={expressionErrors}
          dialect={dialect}
          variables={variables}
        />
      </section>

      <div className="feel-playground__evaluation">
        <ContextEditor
          value={context}
          onChange={onContextChange}
          error={state.status === 'invalid-context' ? state.error : undefined}
        />
        <ResultView state={state} />
      </div>
    </div>
  );
}
