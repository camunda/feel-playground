import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  C4Provider,
  TooltipProvider
} from '@camunda/design-system';

import {
  type Evaluate,
  type EvaluationContext,
  type FeelDialect,
  type FeelLanguageContext,
  type FeelVariable,
  type PlaygroundController,
  type PlaygroundState
} from '../core/types';
import { addMissingContext } from '../core/contextCompleteness';
import { resolveAutocompleteVariables } from '../core/contextVariables';
import { createPlaygroundController } from '../core/createPlaygroundController';
import { nextEvaluationHeight } from '../core/nextEvaluationHeight';
import { parseContext } from '../core/parseContext';
import { resolveEvaluationContext } from '../core/resolveEvaluationContext';
import { toSnippetTemplate } from '../core/snippetTemplate';
import { ContextEditor, type ContextEditorHandle } from './ContextEditor';
import {
  ExpressionEditor,
  type ExpressionEditorHandle,
  type FeelLintReport
} from './ExpressionEditor';
import { ResultView } from './ResultView';
import { StatusIcon } from './StatusIcon';

const EVALUATION_DEBOUNCE = 300;
const MIN_EXPRESSION_HEIGHT = 96;
const RESIZE_STEP = 16;
const SPLITTER_HEIGHT = 5;
const EMPTY_VARIABLES: FeelVariable[] = [];

/**
 * FEEL playground. The host owns expression state, context persistence, and
 * injects the evaluator implementation.
 *
 * Without a context, the playground generates one from the initial expression.
 */
export interface FeelPlaygroundProps {
  expression: string;
  onExpressionChange(expression: string): void;
  context?: string;
  onContextChange(context: string): void;
  dialect: FeelDialect;
  feelLanguageContext?: FeelLanguageContext;
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
  feelLanguageContext,
  variables = EMPTY_VARIABLES,
  onEvaluate,
  evaluationUnavailable
}: FeelPlaygroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const generatingContextRef = useRef(false);
  const contextEditorRef = useRef<ContextEditorHandle | null>(null);
  const controllerRef = useRef<PlaygroundController | null>(null);
  const evaluationRef = useRef<HTMLDivElement | null>(null);
  const expressionEditorRef = useRef<ExpressionEditorHandle | null>(null);
  const resizeRef = useRef<{
    moved: boolean;
    startHeight: number;
    startY: number;
  } | null>(null);
  const openEvaluationHeightRef = useRef<number | null>(null);
  const [ generatedContext, setGeneratedContext ] = useState('{}');
  const [ state, setState ] = useState<PlaygroundState>({ status: 'idle' });
  const [ expressionValid, setExpressionValid ] = useState<boolean | null>(null);
  const [ expressionErrors, setExpressionErrors ] = useState<FeelLintReport[]>([]);
  const [ evaluationHeight, setEvaluationHeight ] = useState<number | null>(null);
  const resolvedContext = context ?? generatedContext;
  const requiredContext = useMemo(
    () => resolveEvaluationContext({
      expression,
      variables,
      feelLanguageContext: {
        ...feelLanguageContext,
        dialect
      }
    }),
    [ dialect, expression, feelLanguageContext, variables ]
  );
  const missingContext = useMemo(() => {
    try {
      return addMissingContext(parseContext(resolvedContext), requiredContext);
    } catch {
      return null;
    }
  }, [ requiredContext, resolvedContext ]);
  const autocompleteVariables = useMemo(
    () => resolveAutocompleteVariables(resolvedContext, variables),
    [ resolvedContext, variables ]
  );

  const handleExpressionChange = (nextExpression: string) => {
    setExpressionValid(null);
    setExpressionErrors([]);
    onExpressionChange(nextExpression);
  };

  const insertContext = (
      nextContext: EvaluationContext,
      options: { focus?: boolean } = {},
      generated = true
  ) => {
    generatingContextRef.current = generated;

    try {
      contextEditorRef.current?.insertTemplate(toSnippetTemplate(nextContext), options);
    } finally {
      generatingContextRef.current = false;
    }
  };

  const handleContextChange = (nextContext: string) => {
    if (context === undefined && generatingContextRef.current) {
      setGeneratedContext(nextContext);
    } else {
      onContextChange(nextContext);
    }
  };

  const handleAddMissingContext = () => {
    if (missingContext) {
      insertContext(missingContext, { focus: true }, false);
    }
  };

  // prefill on open, leaving a context the host restored untouched
  useEffect(() => {
    if (context !== undefined && !isEmptyContext(context)) {
      return;
    }

    insertContext(requiredContext);
  }, []);

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
      context: resolvedContext,
      dialect,
      onEvaluate,
      evaluationUnavailable
    });
  }, [ expression, expressionValid, resolvedContext, dialect, onEvaluate, evaluationUnavailable ]);

  const resizeEvaluation = (startHeight: number, moved = true) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const minimum = getCollapsedEvaluationHeight(evaluationRef.current);
    const maximum = Math.max(
      minimum,
      container.getBoundingClientRect().height - SPLITTER_HEIGHT - MIN_EXPRESSION_HEIGHT
    );

    setEvaluationHeight(nextEvaluationHeight({
      startHeight,
      minimum,
      maximum,
      openHeight: openEvaluationHeightRef.current,
      moved
    }));
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
      if (resize.startHeight > minimum) {
        openEvaluationHeightRef.current = resize.startHeight;
      }

      resizeEvaluation(resize.startHeight, false);
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
    <C4Provider>
      <TooltipProvider>
        <div className="feel-playground" ref={ containerRef } style={ style }>
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
              ref={ expressionEditorRef }
              value={ expression }
              onChange={ handleExpressionChange }
              onValidityChange={ setExpressionValid }
              onErrorsChange={ setExpressionErrors }
              dialect={ dialect }
              variables={ autocompleteVariables }
              engines={ feelLanguageContext?.engines }
            />
          </section>

          <div
            aria-label="Resize Context and Result"
            aria-orientation="horizontal"
            className="feel-playground__resize-handle"
            role="separator"
            tabIndex={ 0 }
            onKeyDown={ handleResizeKeyDown }
            onPointerDown={ handleResizeStart }
            onPointerMove={ handleResize }
            onPointerUp={ handleResizeEnd }
            onPointerCancel={ handleResizeEnd }
          />

          <div className="feel-playground__evaluation" ref={ evaluationRef }>
            <ContextEditor
              ref={ contextEditorRef }
              value={ resolvedContext }
              onChange={ handleContextChange }
              incomplete={ !!missingContext }
              onAddMissingContext={ handleAddMissingContext }
              error={ state.status === 'invalid-context' ? state.error : undefined }
            />
            <ResultView
              state={ state }
              expression={ expression }
              expressionErrors={ expressionErrors }
              onSelectExpressionError={ position => expressionEditorRef.current?.focus(position) }
            />
          </div>
        </div>
      </TooltipProvider>
    </C4Provider>
  );
}

function isEmptyContext(context: string) {
  const trimmed = context.trim();

  return !trimmed || trimmed === '{}';
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
