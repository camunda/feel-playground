# @camunda/feel-playground

[![CI](https://github.com/camunda/feel-playground/actions/workflows/CI.yml/badge.svg?branch=main)](https://github.com/camunda/feel-playground/actions/workflows/CI.yml)

A controlled React component for editing and remotely evaluating FEEL expressions with a JSON context.

The package owns the expression editor, context editor, and result presentation. The host owns expression and context state and provides the evaluation function.

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
	const [context, setContext] = useState('{}');

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

Evaluation is remote-only. Authentication, connectivity, and endpoint-specific request mapping remain host responsibilities. The evaluator must return an object containing `result` and a `warnings` array.

The package requires React 19 and the Camunda Design System. Import the design-system stylesheet once at the application root, followed by the playground stylesheet. In applications that also use Carbon, load Carbon styles first, then design-system styles, then consumer overrides.

The context is a controlled, serialized JSON value. When it is empty, the playground analyzes the expression and prefills the variables it references. The optional `variables` tree provides model-known structure for autocomplete and context generation; references missing from that tree are added with `null` values. The reload action restores this generated context without replacing a context restored by the host on open.

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
git clone https://github.com/camunda/feel-playground.git
cd feel-playground
cp cluster.config.example.json cluster.config.json
npm install
npm start
```

Open the URL printed by Vite. The example configuration uses c8run Basic authentication with username `demo` and password `demo`.
