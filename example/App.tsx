import { useState } from 'react';

import {
  FeelPlayground,
  type Evaluate
} from '../src';
import { evaluateOnConfiguredCluster } from './evaluate';

const INITIAL_EXPRESSION = `{
  url: "https://" + base + ":" + string(protocol)
}`;

const INITIAL_CONTEXT = `{
  "base": "google.com",
  "protocol": 8080
}`;

const WARNING_CONTEXT = `{
  "base": "google.com"
}`;

type Preview =
  | 'live'
  | 'empty'
  | 'expression-error'
  | 'context-error'
  | 'unavailable'
  | 'loading'
  | 'success'
  | 'warning'
  | 'error';

const PREVIEWS: Array<{ id: Preview; label: string }> = [
  { id: 'live', label: 'Live cluster' },
  { id: 'empty', label: 'Empty' },
  { id: 'expression-error', label: 'Expression error' },
  { id: 'context-error', label: 'Context error' },
  { id: 'unavailable', label: 'Unavailable' },
  { id: 'loading', label: 'Loading' },
  { id: 'success', label: 'Success' },
  { id: 'warning', label: 'Warning' },
  { id: 'error', label: 'Evaluation error' }
];

const SUCCESS_EVALUATOR: Evaluate = async () => ({
  result: {
    url: 'https://google.com:8080'
  }
});

const ERROR_EVALUATOR: Evaluate = async () => {
  throw new Error('The cluster rejected the expression.');
};

const LOADING_EVALUATOR: Evaluate = async (_, { signal }) => {
  await new Promise<void>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

  return { result: null };
};

export function App() {
  const [expression, setExpression] = useState(INITIAL_EXPRESSION);
  const [context, setContext] = useState(INITIAL_CONTEXT);
  const [preview, setPreview] = useState<Preview>('live');

  const selectPreview = (nextPreview: Preview) => {
    const nextValues = getPreviewValues(nextPreview);

    setPreview(nextPreview);
    setExpression(nextValues.expression);
    setContext(nextValues.context);
  };

  const {
    evaluationUnavailable,
    onEvaluate
  } = getPreviewConfig(preview);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>FEEL Playground</h1>
        </div>
      </header>

      <nav className="preview-switcher" aria-label="Preview state">
        <div className="preview-switcher__controls">
          {PREVIEWS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={id === preview ? 'is-active' : undefined}
              aria-pressed={id === preview}
              onClick={() => selectPreview(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="app-playground-window">
        <FeelPlayground
          expression={expression}
          onExpressionChange={setExpression}
          context={context}
          onContextChange={setContext}
          dialect="expression"
          evaluationUnavailable={evaluationUnavailable}
          onEvaluate={onEvaluate}
        />
      </div>
    </main>
  );
}

function getPreviewValues(preview: Preview) {
  switch (preview) {
    case 'empty':
      return { expression: '', context: INITIAL_CONTEXT };
    case 'expression-error':
      return { expression: 'base +', context: INITIAL_CONTEXT };
    case 'context-error':
      return { expression: INITIAL_EXPRESSION, context: '{' };
    case 'warning':
      return { expression: INITIAL_EXPRESSION, context: WARNING_CONTEXT };
    default:
      return { expression: INITIAL_EXPRESSION, context: INITIAL_CONTEXT };
  }
}

function getPreviewConfig(preview: Preview): {
  evaluationUnavailable?: string;
  onEvaluate?: Evaluate;
} {
  switch (preview) {
    case 'unavailable':
      return { evaluationUnavailable: 'No Camunda 8 cluster connection.' };
    case 'loading':
      return { onEvaluate: LOADING_EVALUATOR };
    case 'success':
      return { onEvaluate: SUCCESS_EVALUATOR };
    case 'error':
      return { onEvaluate: ERROR_EVALUATOR };
    default:
      return { onEvaluate: evaluateOnConfiguredCluster };
  }
}
