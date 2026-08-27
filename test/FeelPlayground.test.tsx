import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { Evaluate } from '../src/core';
import { FeelPlayground } from '../src/render/FeelPlayground';

const feelEditor = vi.hoisted(() => ({
  onChange: undefined as ((value: string) => void) | undefined,
  onLint: undefined as ((reports: Array<{ type?: string }>) => void) | undefined
}));

vi.mock('@bpmn-io/feel-editor', () => ({
  default: class FeelEditor {
    constructor(config: {
      container: HTMLElement;
      onChange?(value: string): void;
      onLint?(reports: Array<{ type?: string }>): void;
    }) {
      feelEditor.onChange = config.onChange;
      feelEditor.onLint = config.onLint;

      const input = document.createElement('div');
      input.setAttribute('aria-label', 'FEEL expression');
      input.setAttribute('role', 'textbox');
      config.container.appendChild(input);
    }

    setValue() { }

    setVariables() { }
  }
}));

afterEach(() => {
  feelEditor.onChange = undefined;
  feelEditor.onLint = undefined;
  cleanup();
});

describe('<FeelPlayground>', () => {

  it('should show an expression error reported by the editor', async () => {
    // given
    renderPlayground();

    // when
    act(() => feelEditor.onLint?.([{ type: 'Syntax Error' }]));

    // then
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;

    expect(within(expression).getByRole('img', { name: 'Error' })).toBeTruthy();
    expect(within(result).queryByRole('img', { name: 'Error' })).toBeNull();
    expect(await screen.findByText('Enter a valid FEEL expression and context to evaluate.')).toBeTruthy();
  });


  it('should clear an expression error reported by the editor', () => {
    // given
    renderPlayground();
    act(() => feelEditor.onLint?.([{ type: 'Syntax Error' }]));

    // when
    act(() => feelEditor.onLint?.([]));

    // then
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    expect(within(expression).queryByRole('img', { name: 'Error' })).toBeNull();
  });


  it('should wait for lint before evaluating a changed expression', async () => {
    // given
    const onEvaluate = vi.fn().mockResolvedValue({ result: 2 });

    renderPlayground({ onEvaluate });
    act(() => feelEditor.onLint?.([]));
    await waitFor(() => expect(onEvaluate).toHaveBeenCalledOnce());
    onEvaluate.mockClear();

    // when
    act(() => feelEditor.onChange?.('1 +'));

    // then
    expect(await screen.findByText('Enter a valid FEEL expression and context to evaluate.')).toBeTruthy();
    expect(onEvaluate).not.toHaveBeenCalled();
    expect(screen.queryByText('2')).toBeNull();
  });


  it('should evaluate when the host becomes available', async () => {

    // given
    const onEvaluate = vi.fn<Evaluate>().mockResolvedValue({ result: 2 });
    const { rerender } = render(createPlayground({
      context: '{}',
      evaluationUnavailable: 'No cluster connection.'
    }));

    act(() => feelEditor.onLint?.([]));
    expect(await screen.findByText('No cluster connection.')).toBeTruthy();

    // when
    rerenderPlayground(rerender, { onEvaluate });

    // then
    await waitFor(() => expect(onEvaluate).toHaveBeenCalledOnce());
    expect(await screen.findByText('2')).toBeTruthy();
  });


  it('should show a context error for malformed JSON', async () => {
    // when
    renderPlayground({ context: '{' });

    // then
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;

    expect(await within(context).findByRole('img', { name: 'Error' })).toBeTruthy();
    expect(within(result).queryByRole('img', { name: 'Error' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Evaluation context' }).getAttribute('aria-invalid')).toBe('true');
  });


  it('should show a context error for non-object JSON', async () => {
    // when
    renderPlayground({ context: '[]' });

    // then
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    expect(await within(context).findByRole('img', { name: 'Error' })).toBeTruthy();
  });


  it('should show expression and context errors together', async () => {
    // given
    renderPlayground({ context: '{' });

    // when
    act(() => feelEditor.onLint?.([{ type: 'Syntax Error' }]));

    // then
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;

    expect(within(expression).getByRole('img', { name: 'Error' })).toBeTruthy();
    expect(await within(context).findByRole('img', { name: 'Error' })).toBeTruthy();
    expect(within(result).queryByRole('img', { name: 'Error' })).toBeNull();
  });
});

function renderPlayground({
  context = '{}',
  evaluationUnavailable,
  onEvaluate = vi.fn<Evaluate>().mockResolvedValue({ result: 2 })
}: {
  context?: string;
  evaluationUnavailable?: string;
  onEvaluate?: Evaluate;
} = {}) {
  return render(createPlayground({ context, evaluationUnavailable, onEvaluate }));
}

function rerenderPlayground(
  rerender: ReturnType<typeof render>['rerender'],
  props: {
    context?: string;
    evaluationUnavailable?: string;
    onEvaluate?: Evaluate;
  }
) {
  rerender(createPlayground({ context: '{}', ...props }));
}

function createPlayground({
  context,
  evaluationUnavailable,
  onEvaluate
}: {
  context: string;
  evaluationUnavailable?: string;
  onEvaluate?: Evaluate;
}) {
  return (
    <FeelPlayground
      expression="1 + 1"
      onExpressionChange={() => { }}
      context={context}
      onContextChange={() => { }}
      dialect="expression"
      evaluationUnavailable={evaluationUnavailable}
      onEvaluate={onEvaluate}
    />
  );
}
