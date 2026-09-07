import { currentCompletions } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import {
  act,
  cleanup,
  render,
  waitFor
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import { ExpressionEditor } from '../src/render/ExpressionEditor';

beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

afterEach(cleanup);

describe('autocomplete', () => {

  it('should suggest variables from context while typing', async () => {

    // given
    const user = userEvent.setup({ document: window.document });
    const { container } = render(
      <ExpressionEditor
        value=""
        onChange={ () => {} }
        onValidityChange={ () => {} }
        onErrorsChange={ () => {} }
        dialect="expression"
        variables={ [ { name: 'customer', entries: [ { name: 'name' } ] } ] }
      />
    );

    const expression = container.querySelector<HTMLElement>('[aria-label="FEEL expression"]')!;
    const editor = EditorView.findFromDOM(expression)!;

    // when
    await act(() => user.type(expression, 'cust'));

    // then
    await waitFor(() => {
      expect(currentCompletions(editor.state).map(({ label }) => label)).to.contain('customer');
    });
  });


  it('should suggest variables updated after mount', async () => {

    // given
    const user = userEvent.setup({ document: window.document });
    const { container, rerender } = render(createEditor([]));

    rerender(createEditor([ { name: 'customer' } ]));

    const expression = container.querySelector<HTMLElement>('[aria-label="FEEL expression"]')!;
    const editor = EditorView.findFromDOM(expression)!;

    // when
    await act(() => user.type(expression, 'cust'));

    // then
    await waitFor(() => {
      expect(currentCompletions(editor.state).map(({ label }) => label)).to.contain('customer');
    });
  });

});

function createEditor(variables: Array<{ name: string; entries?: Array<{ name: string }> }>) {
  return (
    <ExpressionEditor
      value=""
      onChange={ () => {} }
      onValidityChange={ () => {} }
      onErrorsChange={ () => {} }
      dialect="expression"
      variables={ variables }
    />
  );
}
