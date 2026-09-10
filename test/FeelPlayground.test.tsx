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

Range.prototype.getClientRects = vi.fn(() => [] as unknown as DOMRectList);
Range.prototype.getBoundingClientRect = vi.fn(() => new DOMRect());

afterEach(cleanup);

describe('<FeelPlayground>', () => {

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
