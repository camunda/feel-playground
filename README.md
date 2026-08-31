# @camunda/feel-playground

A controlled React component for editing and remotely evaluating FEEL expressions with a JSON context.

The package owns the expression editor, context editor, and result presentation. The host owns expression and context state and provides the evaluation function.

## Usage

Import the component and its stylesheet:

```tsx
import { useState } from 'react';

import {
	FeelPlayground,
	type Evaluate,
	type EvaluationContext
} from '@camunda/feel-playground';
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

const resolveContext = async (): Promise<EvaluationContext> => {
	const response = await fetch('/api/evaluation-context');

	return response.json();
};

export function Playground() {
	const [expression, setExpression] = useState('x + y');
	const [context, setContext] = useState('{ "x": 10, "y": 20 }');

	return <FeelPlayground
		expression={expression}
		onExpressionChange={setExpression}
		context={context}
		onContextChange={setContext}
		resolveContext={resolveContext}
		dialect="expression"
		onEvaluate={evaluate}
	/>;
}
```

Evaluation is remote-only. Authentication, connectivity, and endpoint-specific request mapping remain host responsibilities. The evaluator must return an object containing `result` and a `warnings` array.

The context is a controlled, serialized JSON value. When `resolveContext` is provided, the playground shows a reload action that resolves a fresh context object, serializes it into the editor, and evaluates the expression again. Context resolution is best-effort; failures preserve the current context.

When evaluation is temporarily unavailable, omit `onEvaluate` and explain why with `evaluationUnavailable`:

```tsx
<FeelPlayground
	expression={expression}
	onExpressionChange={setExpression}
	context={context}
	onContextChange={setContext}
	dialect="expression"
	evaluationUnavailable="Connect to a Camunda cluster to evaluate this expression."
/>
```

## Run locally with c8run

Start a Camunda 8.9+ c8run instance on `http://localhost:8080`, then:

```sh
git clone https://github.com/jarekdanielak/feel-playground.git
cd feel-playground
cp cluster.config.example.json cluster.config.json
npm install
npm start
```

Open the URL printed by Vite. The example configuration uses c8run Basic authentication with username `demo` and password `demo`.