import { useState } from 'react';

import { FeelPlayground } from '../src';
import { evaluateOnConfiguredCluster } from './evaluate';

const INITIAL_EXPRESSION = `{
  url: "https://" + base + ":" + string(protocol)
}`;

const INITIAL_CONTEXT = `{
  "base": "google.com",
  "protocol": 8080
}`;

export function App() {
  const [expression, setExpression] = useState(INITIAL_EXPRESSION);
  const [context, setContext] = useState(INITIAL_CONTEXT);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>FEEL Playground</h1>
        </div>
      </header>

      <div className="app-playground-window">
        <FeelPlayground
          expression={expression}
          onExpressionChange={setExpression}
          context={context}
          onContextChange={setContext}
          dialect="expression"
          onEvaluate={evaluateOnConfiguredCluster}
        />
      </div>
    </main>
  );
}
