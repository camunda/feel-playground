import {
  useState
} from 'react';
import {
  act,
  cleanup,
  fireEvent,
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

import type { Evaluate } from '../src/core/types';
import { FeelPlayground } from '../src/render/FeelPlayground';

const feelEditor = vi.hoisted(() => ({
  focus: vi.fn(),
  onChange: undefined as ((value: string) => void) | undefined,
  onLint: undefined as ((reports: Array<{
    from: number;
    message: string;
    severity: 'error' | 'warning';
    to: number;
    type?: string;
  }>) => void) | undefined
}));

vi.mock('@bpmn-io/feel-editor', () => ({
  default: class FeelEditor {
    constructor(config: {
      container: HTMLElement;
      onChange?(value: string): void;
      onLint?(reports: Array<{
        from: number;
        message: string;
        severity: 'error' | 'warning';
        to: number;
        type?: string;
      }>): void;
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

    focus(position: number) {
      feelEditor.focus(position);
    }
  }
}));

afterEach(() => {
  feelEditor.onChange = undefined;
  feelEditor.onLint = undefined;
  feelEditor.focus.mockReset();
  cleanup();
});

describe('<FeelPlayground>', () => {

  it('should show an expression error in the result panel and focus it in the editor', async () => {
    // given
    renderPlayground();
    act(() => feelEditor.onLint?.([
      {
        from: 2,
        message: 'The operator needs a right-hand value.',
        severity: 'error',
        to: 3,
        type: 'Syntax Error'
      },
      {
        from: 4,
        message: 'Unexpected token.',
        severity: 'error',
        to: 5,
        type: 'Syntax Error'
      }
    ]));
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;
    const firstError = within(result).getByRole('button', {
      name: /The operator needs a right-hand value\./
    });

    // when
    fireEvent.click(firstError);

    // then
    expect(within(expression).getAllByRole('img', { name: 'Error' })).toHaveLength(1);
    expect(within(expression).getByText('2')).toBeTruthy();
    expect(firstError).toBeTruthy();
    expect(within(result).getByRole('button', { name: /Unexpected token\./ })).toBeTruthy();
    expect(within(result).getAllByText('Syntax error.')).toHaveLength(2);
    expect(within(result).getByText('The operator needs a right-hand value.')).toBeTruthy();
    expect(within(result).getAllByRole('img', { name: 'Error' })).toHaveLength(2);
    expect(await screen.findByText('Fix the errors in your FEEL expression to evaluate it.')).toBeTruthy();
    expect(feelEditor.focus).toHaveBeenCalledWith(2);
  });


  it('should clear an expression error reported by the editor', () => {
    // given
    renderPlayground();
    act(() => feelEditor.onLint?.([{
      from: 2,
      message: 'The operator needs a right-hand value.',
      severity: 'error',
      to: 3,
      type: 'Syntax Error'
    }]));

    // when
    act(() => feelEditor.onLint?.([]));

    // then
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;
    expect(within(expression).queryByRole('img', { name: 'Error' })).toBeNull();
    expect(within(result).queryByLabelText('Expression errors')).toBeNull();
  });


  it('should wait for lint before evaluating a changed expression', async () => {
    // given
    const onEvaluate = vi.fn().mockResolvedValue({ result: 2, warnings: [] });

    renderPlayground({ onEvaluate });
    act(() => feelEditor.onLint?.([]));
    await waitFor(() => expect(onEvaluate).toHaveBeenCalledOnce());
    onEvaluate.mockClear();

    // when
    act(() => feelEditor.onChange?.('1 +'));

    // then
    expect(await screen.findByText('Checking your FEEL expression before evaluation…')).toBeTruthy();
    expect(onEvaluate).not.toHaveBeenCalled();
    expect(screen.queryByText('2')).toBeNull();
  });


  it('should evaluate when the host becomes available', async () => {

    // given
    const onEvaluate = vi.fn<Evaluate>().mockResolvedValue({ result: 2, warnings: [] });
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


  it('should ignore Home and End when resizing the evaluation pane', () => {
    // given
    renderPlayground();

    const separator = screen.getByRole('separator', { name: 'Resize Context and Result' });

    // when
    fireEvent.keyDown(separator, { key: 'Home' });
    fireEvent.keyDown(separator, { key: 'End' });

    // then
    expect(separator.parentElement?.style.gridTemplateRows).toBe('');
  });


  it('should toggle the evaluation pane on resize handle click', () => {
    // given
    renderPlayground();

    const separator = screen.getByRole('separator', { name: 'Resize Context and Result' });
    const playground = separator.parentElement!;
    const evaluation = playground.querySelector<HTMLElement>('.feel-playground__evaluation')!;
    const headings = evaluation.querySelectorAll<HTMLElement>('.feel-playground__section-heading');

    evaluation.style.gridTemplateColumns = '1fr 1fr';
    separator.setPointerCapture = vi.fn();
    separator.releasePointerCapture = vi.fn();
    vi.spyOn(playground, 'getBoundingClientRect').mockReturnValue({ height: 500 } as DOMRect);
    vi.spyOn(evaluation, 'getBoundingClientRect').mockImplementation(() => ({
      height: playground.style.gridTemplateRows.endsWith('40px') ? 40 : 200
    } as DOMRect));
    headings.forEach(heading => {
      vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue({ height: 40 } as DOMRect);
    });

    // when
    fireEvent.pointerDown(separator, { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(separator, { clientY: 200, pointerId: 1 });

    // then
    expect(playground.style.gridTemplateRows).toBe('minmax(96px, 1fr) 5px 40px');

    // when
    fireEvent.pointerDown(separator, { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(separator, { clientY: 200, pointerId: 1 });

    // then
    expect(playground.style.gridTemplateRows).toBe('minmax(96px, 1fr) 5px 200px');
  });


  it('should explain the context and result panes', () => {
    // when
    renderPlayground();

    // then
    expect(screen.getByText('Add input variables as a JSON object.')).toBeTruthy();
    expect(screen.getByText('Updates when the expression or context changes.')).toBeTruthy();
  });


  it('should reload context and evaluate again', async () => {
    // given
    const onEvaluate = vi.fn<Evaluate>().mockResolvedValue({ result: 2, warnings: [] });
    const resolveContext = vi.fn().mockResolvedValue({ customer: null });
    function Playground() {
      const [context, setContext] = useState('{ "customer": 42 }');

      return createPlayground({
        context,
        onContextChange: setContext,
        onEvaluate,
        resolveContext
      });
    }

    render(<Playground />);
    act(() => feelEditor.onLint?.([]));
    await waitFor(() => expect(onEvaluate).toHaveBeenCalledOnce());
    onEvaluate.mockClear();

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Reset to prefilled context' }));

    // then
    await waitFor(() => {
      expect(resolveContext).toHaveBeenCalledOnce();
      expect(onEvaluate).toHaveBeenCalledWith(
        {
          context: { customer: null },
          dialect: 'expression',
          expression: '1 + 1'
        },
        expect.anything()
      );
    });
  });


  it('should show a context error for malformed JSON', async () => {
    // when
    renderPlayground({ context: '{' });

    // then
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;
    const contextHeading = within(context).getByRole('heading', { name: 'Context' }).parentElement!;
    const resetButton = within(contextHeading).getByRole('button', { name: 'Reset to prefilled context' });
    const errorIcon = within(contextHeading).getByRole('img', { name: 'Error' });

    expect(await within(context).findAllByRole('img', { name: 'Error' })).toHaveLength(2);
    expect(resetButton.compareDocumentPosition(errorIcon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(context).getByRole('button', { name: /Context error/ })).toBeTruthy();
    expect(within(context).queryByText(/at position \d+/)).toBeNull();
    expect(within(result).queryByRole('img', { name: 'Error' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Evaluation context' }).getAttribute('aria-invalid')).toBe('true');
  });


  it('should show a context error for non-object JSON', async () => {
    // when
    renderPlayground({ context: '[]' });

    // then
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    expect(await within(context).findAllByRole('img', { name: 'Error' })).toHaveLength(2);
  });


  it('should focus a context error reported by the editor', async () => {
    // given
    renderPlayground({ context: '{' });

    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    const error = await within(context).findByRole('button', { name: /Context error/ });

    // when
    fireEvent.click(error);

    // then
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Evaluation context' }));
  });


  it('should show expression and context errors together', async () => {
    // given
    renderPlayground({ context: '{' });

    // when
    act(() => feelEditor.onLint?.([{
      from: 2,
      message: 'The operator needs a right-hand value.',
      severity: 'error',
      to: 3,
      type: 'Syntax Error'
    }]));

    // then
    const expression = screen.getByRole('heading', { name: 'FEEL expression' }).closest('section')!;
    const context = screen.getByRole('heading', { name: 'Context' }).closest('section')!;
    const result = screen.getByRole('heading', { name: 'Result' }).closest('section')!;

    expect(within(expression).getAllByRole('img', { name: 'Error' })).toHaveLength(1);
    expect(await within(context).findAllByRole('img', { name: 'Error' })).toHaveLength(2);
    expect(within(result).getAllByRole('img', { name: 'Error' })).toHaveLength(1);
  });
});

function renderPlayground({
  context = '{}',
  evaluationUnavailable,
  onEvaluate = vi.fn<Evaluate>().mockResolvedValue({ result: 2, warnings: [] }),
  onContextChange = () => { },
  resolveContext
}: {
  context?: string;
  evaluationUnavailable?: string;
  onEvaluate?: Evaluate;
  onContextChange?: (context: string) => void;
  resolveContext?: () => Promise<Record<string, unknown>>;
} = {}) {
  return render(createPlayground({
    context,
    evaluationUnavailable,
    onEvaluate,
    onContextChange,
    resolveContext
  }));
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
  onEvaluate,
  onContextChange = () => { },
  resolveContext = async () => ({})
}: {
  context: string;
  evaluationUnavailable?: string;
  onEvaluate?: Evaluate;
  onContextChange?: (context: string) => void;
  resolveContext?: () => Promise<Record<string, unknown>>;
}) {
  return (
    <FeelPlayground
      expression="1 + 1"
      onExpressionChange={() => { }}
      context={context}
      onContextChange={onContextChange}
      resolveContext={resolveContext}
      dialect="expression"
      evaluationUnavailable={evaluationUnavailable}
      onEvaluate={onEvaluate}
    />
  );
}
