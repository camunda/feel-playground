import { useEffect, useRef, useState } from 'react';

import {
  createPlaygroundController,
  type Evaluate,
  type FeelDialect,
  type PlaygroundController,
  type PlaygroundState
} from '../core';
import { ContextEditor } from './ContextEditor';
import { ExpressionEditor, type FeelVariable } from './ExpressionEditor';
import { ResultView } from './ResultView';

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
  debounce?: number;
}

export function FeelPlayground({
  expression,
  onExpressionChange,
  context,
  onContextChange,
  dialect,
  variables = [],
  onEvaluate,
  evaluationUnavailable,
  debounce = 300
}: FeelPlaygroundProps) {
  const controllerRef = useRef<PlaygroundController | null>(null);
  const [state, setState] = useState<PlaygroundState>({ status: 'idle' });

  useEffect(() => {
    const controller = createPlaygroundController({ debounce });
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setState);

    return () => {
      controllerRef.current = null;
      unsubscribe();
      controller.dispose();
    };
  }, [debounce]);

  useEffect(() => {
    controllerRef.current?.update({
      expression,
      context,
      dialect,
      onEvaluate,
      evaluationUnavailable
    });
  }, [expression, context, dialect, onEvaluate, evaluationUnavailable, debounce]);

  return (
    <div className="feel-playground">
      <section className="feel-playground__section feel-playground__expression">
        <div className="feel-playground__section-heading">
          <h3>{dialect === 'unaryTests' ? 'Unary tests' : 'FEEL expression'}</h3>
        </div>
        <ExpressionEditor
          value={expression}
          onChange={onExpressionChange}
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
