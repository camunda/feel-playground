# FEEL Playground

A controlled React component for editing and remotely evaluating FEEL expressions with a JSON context.

The package owns the expression editor, context editor, and result presentation. The host owns expression and context state and provides the evaluation function.

```tsx
import { useState } from 'react';

import { FeelPlayground, type Evaluate } from '@bpmn-io/feel-playground';

const evaluate: Evaluate = async (input, { signal }) => {
	const response = await fetch('/api/evaluate', {
		method: 'POST',
		body: JSON.stringify(input),
		signal
	});

	return response.json();
};

export function Playground() {
	const [ expression, setExpression ] = useState('x + y');
	const [ context, setContext ] = useState('{ "x": 10, "y": 20 }');

	return <FeelPlayground
		expression={ expression }
		onExpressionChange={ setExpression }
		context={ context }
		onContextChange={ setContext }
		dialect="expression"
		onEvaluate={ evaluate }
	/>;
}
```

Evaluation is remote-only. Authentication, connectivity, and endpoint-specific request mapping remain host responsibilities.

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