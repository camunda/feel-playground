import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState
} from 'react';

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
const MIN_EXPRESSION_HEIGHT = 96;
const RESIZE_STEP = 16;
const SPLITTER_HEIGHT = 5;

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PlaygroundController | null>(null);
  const evaluationRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<{
    moved: boolean;
    startHeight: number;
    startY: number;
  } | null>(null);
  const openEvaluationHeightRef = useRef<number | null>(null);
  const [state, setState] = useState<PlaygroundState>({ status: 'idle' });
  const [expressionValid, setExpressionValid] = useState<boolean | null>(null);
  const [expressionErrors, setExpressionErrors] = useState<FeelLintReport[]>([]);
  const [evaluationHeight, setEvaluationHeight] = useState<number | null>(null);

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

  const resizeEvaluation = (height: number) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const minimum = getCollapsedEvaluationHeight(evaluationRef.current);
    const maximum = Math.max(
      minimum,
      container.getBoundingClientRect().height - SPLITTER_HEIGHT - MIN_EXPRESSION_HEIGHT
    );

    setEvaluationHeight(Math.min(maximum, Math.max(minimum, height)));
  };

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    const evaluation = evaluationRef.current;

    if (!evaluation) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      moved: false,
      startHeight: evaluation.getBoundingClientRect().height,
      startY: event.clientY
    };
  };

  const handleResize = (event: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;

    if (!resize) {
      return;
    }

    if (event.clientY === resize.startY) {
      return;
    }

    resize.moved = true;
    resizeEvaluation(resize.startHeight + resize.startY - event.clientY);
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;

    if (!resize) {
      return;
    }

    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const evaluation = evaluationRef.current;

    if (!evaluation) {
      return;
    }

    const minimum = getCollapsedEvaluationHeight(evaluation);

    if (!resize.moved) {
      if (resize.startHeight <= minimum) {
        resizeEvaluation(openEvaluationHeightRef.current || minimum);
      } else {
        openEvaluationHeightRef.current = resize.startHeight;
        resizeEvaluation(minimum);
      }
    } else if (evaluation.getBoundingClientRect().height > minimum) {
      openEvaluationHeightRef.current = evaluation.getBoundingClientRect().height;
    }
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentHeight = evaluationRef.current?.getBoundingClientRect().height || 0;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      resizeEvaluation(currentHeight + RESIZE_STEP);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      resizeEvaluation(currentHeight - RESIZE_STEP);
    }
  };

  const style = evaluationHeight === null
    ? undefined
    : {
      gridTemplateRows: `minmax(${MIN_EXPRESSION_HEIGHT}px, 1fr) ${SPLITTER_HEIGHT}px ${evaluationHeight}px`
    };

  return (
    <div className="feel-playground" ref={containerRef} style={style}>
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

      <div
        aria-label="Resize Context and Result"
        aria-orientation="horizontal"
        className="feel-playground__resize-handle"
        role="separator"
        tabIndex={0}
        onKeyDown={handleResizeKeyDown}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResize}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
      />

      <div className="feel-playground__evaluation" ref={evaluationRef}>
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

function getCollapsedEvaluationHeight(evaluation: HTMLDivElement | null) {
  if (!evaluation) {
    return 0;
  }

  const headings = Array.from(
    evaluation.querySelectorAll<HTMLElement>('.feel-playground__section-heading')
  );

  if (!headings.length) {
    return 0;
  }

  const columns = getComputedStyle(evaluation).gridTemplateColumns.split(' ').length;
  const heights = headings.map(heading => heading.getBoundingClientRect().height);

  return columns === 1
    ? heights.reduce((total, height) => total + height, 0)
    : Math.max(...heights);
}
