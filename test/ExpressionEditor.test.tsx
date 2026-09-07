import {
  cleanup,
  render
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { ExpressionEditor } from '../src/render/ExpressionEditor';
import { FeelPlayground } from '../src/render/FeelPlayground';

const editor = vi.hoisted(() => ({
  focus: vi.fn(),
  setEngines: vi.fn(),
  setValue: vi.fn(),
  setVariables: vi.fn()
}));

const FeelEditor = vi.hoisted(() => vi.fn(function() {
  return editor;
}));

vi.mock('@bpmn-io/feel-editor', () => ({
  default: FeelEditor
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<ExpressionEditor>', () => {

  it('should configure compatibility linting for engines', () => {

    // when
    renderEditor({ engines: { camunda: '8.8' } });

    // then
    expect(FeelEditor).toHaveBeenCalledWith(expect.objectContaining({
      engines: { camunda: '8.8' }
    }));
  });


  it('should update compatibility linting when engines change', () => {

    // given
    const { rerender } = renderEditor({ engines: { camunda: '8.8' } });

    // when
    rerender(createEditor({ engines: { camunda: '8.9' } }));

    // then
    expect(editor.setEngines).toHaveBeenLastCalledWith({ camunda: '8.9' });
  });


  it('should configure compatibility linting from the playground language context', () => {

    // when
    render(
      <FeelPlayground
        expression="foo"
        onExpressionChange={ () => {} }
        context="{}"
        onContextChange={ () => {} }
        dialect="expression"
        feelLanguageContext={ { engines: { camunda: '8.8' } } }
      />
    );

    // then
    expect(FeelEditor).toHaveBeenCalledWith(expect.objectContaining({
      engines: { camunda: '8.8' }
    }));
  });


  it('should update autocomplete variables from context', () => {

    // given
    const { rerender } = render(
      <FeelPlayground
        expression="customer.name"
        onExpressionChange={ () => {} }
        context={ '{ "customer": { "name": "Jane" } }' }
        onContextChange={ () => {} }
        dialect="expression"
        variables={ [ { name: 'processVariable', detail: 'Number' } ] }
      />
    );

    // when
    rerender(
      <FeelPlayground
        expression="order.total"
        onExpressionChange={ () => {} }
        context={ '{ "order": { "total": 42 } }' }
        onContextChange={ () => {} }
        dialect="expression"
        variables={ [ { name: 'processVariable', detail: 'Number' } ] }
      />
    );

    // then
    expect(editor.setVariables).toHaveBeenLastCalledWith([
      { name: 'processVariable', detail: 'Number' },
      {
        name: 'order',
        detail: 'Context',
        info: '{\n  "total": 42\n}',
        entries: [
          { name: 'total', detail: 'Number', info: '42' }
        ]
      }
    ]);
  });

});

function renderEditor({ engines }: { engines?: Record<string, string> } = {}) {
  return render(createEditor({ engines }));
}

function createEditor({ engines }: { engines?: Record<string, string> } = {}) {
  return (
    <ExpressionEditor
      value="foo"
      onChange={ () => {} }
      onValidityChange={ () => {} }
      onErrorsChange={ () => {} }
      dialect="expression"
      variables={ [] }
      engines={ engines }
    />
  );
}
