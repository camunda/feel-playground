import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { useState } from 'react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FeelPlayground } from '../src/render/FeelPlayground';
import type { EvaluationUnavailable } from '../src';

Range.prototype.getClientRects = vi.fn(() => [] as unknown as DOMRectList);
Range.prototype.getBoundingClientRect = vi.fn(() => new DOMRect());

afterEach(cleanup);

describe('<FeelPlayground>', () => {

  it('should update structured unavailable content and enable evaluation when connected', async () => {

    // given
    const onClick = vi.fn();
    const unavailable: EvaluationUnavailable = {
      title: 'No connection selected',
      message: 'Select a connection to evaluate.',
      action: { label: 'Select connection', onClick }
    };
    const props = {
      expression: '1 + 1',
      onExpressionChange: vi.fn(),
      context: '{}',
      onContextChange: vi.fn(),
      dialect: 'expression' as const
    };
    const { rerender } = render(<FeelPlayground { ...props } evaluationUnavailable={ unavailable } />);

    // then
    await screen.findByRole('heading', { name: 'No connection selected' });

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Select connection' }));

    // then
    expect(onClick).toHaveBeenCalledOnce();

    // when
    const nextAction = vi.fn();
    rerender(<FeelPlayground { ...props } evaluationUnavailable={ {
      ...unavailable,
      title: 'Credentials rejected',
      message: 'Check the connection credentials.',
      action: { label: 'Manage connection', onClick: nextAction }
    } } />);

    // then
    await screen.findByRole('heading', { name: 'Credentials rejected' });
    expect(screen.queryByRole('button', { name: 'Select connection' })).not.to.exist;

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Manage connection' }));

    // then
    expect(nextAction).toHaveBeenCalledOnce();

    // when
    const onEvaluate = vi.fn().mockResolvedValue({ result: 2, warnings: [] });
    rerender(<FeelPlayground { ...props } onEvaluate={ onEvaluate } evaluationUnavailable={ unavailable } />);

    // then
    await waitFor(() => expect(onEvaluate).toHaveBeenCalledOnce());
    expect(screen.queryByRole('heading', { name: 'Credentials rejected' })).not.to.exist;
    expect(screen.queryByRole('heading', { name: 'No connection selected' })).not.to.exist;
    expect(screen.queryByRole('button', { name: 'Manage connection' })).not.to.exist;
  });


  it('should not show an unavailable action without an expression', async () => {

    // when
    render(<FeelPlayground
      expression=""
      onExpressionChange={ vi.fn() }
      context="{}"
      onContextChange={ vi.fn() }
      dialect="expression"
      evaluationUnavailable={ {
        title: 'No connection selected',
        message: 'Select a connection to evaluate.',
        action: { label: 'Select connection', onClick: vi.fn() }
      } }
    />);

    // then
    await screen.findByText('Write an expression to see the result');
    expect(screen.queryByRole('button', { name: 'Select connection' })).not.to.exist;
  });

  it('should prefill context from initial expression', async () => {

    // given
    const onContextChange = vi.fn();

    // when
    render(<Playground onContextChange={ onContextChange } />);

    // then
    await waitFor(() => {
      expect(screen.getByLabelText('Evaluation context').textContent).toContain('"foo": null');
    });
  });


  it('should indicate incomplete context when expression changes', async () => {

    // given
    const onContextChange = vi.fn();

    render(<Playground onContextChange={ onContextChange } />);

    await waitFor(() => {
      expect(screen.getByLabelText('Evaluation context').textContent).toContain('"foo": null');
    });

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Change expression' }));

    // then
    expect(screen.getByLabelText('Evaluation context').textContent).not.toContain('"bar": null');
    expect(screen.getByRole('button', { name: 'Update context variables' })).toBeTruthy();
    expect(onContextChange).not.toHaveBeenCalled();
  });


  it('should add missing context from expression', async () => {

    // given
    const onContextChange = vi.fn();

    render(
      <Playground
        initialExpression="foo + bar"
        initialContext={ '{ "foo": 42 }' }
        onContextChange={ onContextChange }
      />
    );

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Update context variables' }));

    // then
    await waitFor(() => {
      const context = screen.getByLabelText('Evaluation context').textContent;

      expect(context).toContain('"foo": 42');
      expect(context).toContain('"bar": null');
    });

    expect(onContextChange).toHaveBeenCalledOnce();
  });


  it('should keep updated generated context local', async () => {

    // given
    const onContextChange = vi.fn();

    render(<Playground onContextChange={ onContextChange } />);

    await waitFor(() => {
      expect(screen.getByLabelText('Evaluation context').textContent).toContain('"foo": null');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Change expression' }));

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Update context variables' }));

    // then
    await waitFor(() => {
      expect(screen.getByLabelText('Evaluation context').textContent).toContain('"bar": null');
    });

    expect(onContextChange).not.toHaveBeenCalled();
  });


  it('should report user changes to generated context', async () => {

    // given
    const onContextChange = vi.fn();

    render(<Playground onContextChange={ onContextChange } />);

    const context = await screen.findByLabelText('Evaluation context');

    await waitFor(() => {
      expect(context.textContent).toContain('"foo": null');
    });

    const editor = EditorView.findFromDOM(context)!;

    // when
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: '{ "custom": 42 }'
      }
    });

    // then
    expect(onContextChange).toHaveBeenCalledOnce();
    expect(onContextChange).toHaveBeenCalledWith('{ "custom": 42 }');
  });

});

function Playground({
  initialExpression = 'foo',
  initialContext,
  onContextChange
}: {
  initialExpression?: string;
  initialContext?: string;
  onContextChange(context: string): void;
}) {
  const [ expression, setExpression ] = useState(initialExpression);
  const [ context, setContext ] = useState(initialContext);

  const handleContextChange = (nextContext: string) => {
    setContext(nextContext);
    onContextChange(nextContext);
  };

  return (
    <>
      <button onClick={ () => setExpression('foo + bar') }>Change expression</button>
      <FeelPlayground
        expression={ expression }
        onExpressionChange={ setExpression }
        context={ context }
        onContextChange={ handleContextChange }
        dialect="expression"
      />
    </>
  );
}
