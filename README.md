# @camunda/feel-playground

[![CI](https://github.com/camunda/feel-playground/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/camunda/feel-playground/actions/workflows/CI.yml)

A React component for editing and remotely evaluating FEEL expressions with a JSON context.

## Features

- FEEL expression and unary-tests editing
- Autocomplete and diagnostics
- JSON context editing and prefill
- Detection and completion of missing context variables
- Remote evaluation with result, warning, loading, and error states
- Host-provided variables and FEEL language configuration

## Usage

Import the component and its stylesheet:

```tsx
import { useState } from 'react';

import {
  FeelPlayground,
  type Evaluate
} from '@camunda/feel-playground';
import '@camunda/design-system/styles.css';
import '@camunda/feel-playground/style.css';

const evaluate: Evaluate = async (input, { signal }) => {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input),
    signal
  });

  const { result, warnings = [] } = await response.json();

  return { result, warnings };
};

export function Playground() {
  const [expression, setExpression] = useState('x + y');
  const [context, setContext] = useState<string>();

  return <FeelPlayground
    expression={expression}
    onExpressionChange={setExpression}
    context={context}
    onContextChange={setContext}
    dialect="expression"
    variables={[ { name: 'x' }, { name: 'y' } ]}
    onEvaluate={evaluate}
  />;
}
```

## API

### `FeelPlayground`

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `expression` | `string` | Yes | Current FEEL expression or unary tests. |
| `onExpressionChange` | `(expression: string) => void` | Yes | Called when the expression changes. |
| `context` | `string` | No | Serialized JSON evaluation context. Omit to prefill it from the initial expression. |
| `onContextChange` | `(context: string) => void` | Yes | Called when the context changes. |
| `dialect` | `'expression' \| 'unaryTests'` | Yes | FEEL syntax accepted by the editor. |
| `feelLanguageContext` | `FeelLanguageContext` | No | Built-ins, parser dialect, and engine compatibility configuration. |
| `variables` | `FeelVariable[]` | No | Variables available for autocomplete and context generation. |
| `onEvaluate` | `Evaluate` | No | Evaluates the expression remotely. |
| `evaluationUnavailable` | `string` | No | Explains why evaluation is unavailable when no evaluator is provided. |

The package is distributed as ESM and requires React 19 and the Camunda Design System. Evaluation, authentication, and connectivity are provided by the host.

## Run locally with c8run

Start a Camunda 8.9+ c8run instance on `http://localhost:8080`, then:

```sh
git clone https://github.com/camunda/feel-playground.git
cd feel-playground
cp cluster.config.example.json cluster.config.json
npm install
npm start
```

Open the URL printed by Vite. The example configuration uses c8run Basic authentication with username `demo` and password `demo`.
