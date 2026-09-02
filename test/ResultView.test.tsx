import {
  cleanup,
  render,
  screen,
  within
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'vitest';

import type { PlaygroundState } from '../src/core/types';
import { ResultView } from '../src/render/ResultView';

afterEach(cleanup);

describe('<ResultView>', () => {

  it('should prompt for an expression while idle', () => {

    // when
    renderResult({ status: 'idle' });

    // then
    expect(screen.getByText('Enter an expression to evaluate.')).toBeTruthy();
  });


  it('should prompt for valid input when the expression is invalid', () => {

    // when
    renderResult({ status: 'invalid-expression' });

    // then
    expect(screen.getByText('Fix the errors in your FEEL expression to evaluate it.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });


  it('should prompt for valid input while expression lint is pending', () => {

    // when
    renderResult({ status: 'validating-expression' });

    // then
    expect(screen.getByText('Evaluating…')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Loading' })).toBeTruthy();
  });


  it('should prompt for valid input when the context is invalid', () => {

    // when
    renderResult({ status: 'invalid-context', error: 'Invalid JSON' });

    // then
    expect(screen.getByText('Fix the errors in your context to evaluate the expression.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });


  it('should prioritize expression errors over context errors', () => {

    // when
    render(
      <ResultView
        state={ { status: 'invalid-context', error: 'Invalid JSON' } }
        expressionErrors={ [ {
          from: 0,
          message: 'Unexpected token.',
          severity: 'error',
          to: 1
        } ] }
      />
    );

    // then
    expect(screen.getByText('Fix the errors in your FEEL expression to evaluate it.')).toBeTruthy();
    expect(screen.queryByText(/errors in your context/)).toBeNull();
  });


  it('should show that evaluation is scheduled', () => {

    // when
    renderResult({ status: 'scheduled' });

    // then
    expect(screen.getByText('Evaluating…')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Loading' })).toBeTruthy();
  });


  it('should show that evaluation is loading', () => {

    // when
    renderResult({ status: 'loading' });

    // then
    expect(screen.getByText('Evaluating…')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Loading' })).toBeTruthy();
  });


  it('should show host unavailability as a warning', () => {

    // when
    renderResult({ status: 'unavailable', message: 'Connect to a cluster.' });

    // then
    expect(screen.getByText('Connect to a cluster.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Warning' })).toBeTruthy();
  });


  it('should show a successful object result', () => {

    // when
    const { container } = renderResult({ status: 'success', result: { total: 2 } });

    // then
    expect(container.querySelector('.feel-playground__result-editor')?.textContent).toContain('"total": 2');
    expect(screen.getByRole('img', { name: 'Success' })).toBeTruthy();
  });


  it('should show an evaluation result in a minimal read-only editor', () => {

    // when
    const { container } = renderResult({ status: 'success', result: { total: 2 } });

    // then
    const editor = container.querySelector('.feel-playground__result-editor .cm-editor');
    const content = container.querySelector('.feel-playground__result-editor .cm-content');

    expect(editor).toBeTruthy();
    expect(content?.getAttribute('contenteditable')).toBe('false');
    expect(content?.getAttribute('tabindex')).toBe('-1');
    expect(container.querySelector('.feel-playground__result-editor .cm-gutters')).toBeNull();
  });


  it('should not show an editor without an evaluation result', () => {

    // when
    const { container } = renderResult({ status: 'loading' });

    // then
    expect(container.querySelector('.feel-playground__result-editor')).toBeNull();
  });


  it('should show a successful string result with JSON quotes', () => {

    // when
    const { container } = renderResult({ status: 'success', result: 'approved' });

    // then
    expect(container.querySelector('.feel-playground__result-editor')?.textContent).toBe('"approved"');
  });


  it('should show an error provided by the host', () => {

    // when
    renderResult({ status: 'error', error: 'Request failed.' });

    // then
    expect(screen.getByText('Request failed.')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Error' })).toBeTruthy();
  });


  it('should show a generic host warning unchanged', () => {

    // when
    renderWarning({ message: 'Result may be incomplete.' });

    // then
    const warning = screen.getByText('Result may be incomplete.');
    expect(warning.querySelector('strong')).toBeNull();
  });


  it('should format a no-variable warning type provided by the host', () => {

    // when
    renderWarning({
      type: 'NO_VARIABLE_FOUND',
      message: "No variable found with name 'customer'"
    });

    // then
    expect(screen.getByText('No Variable Found:').tagName).toBe('STRONG');
  });


  it('should format a no-variable warning message provided by the host', () => {

    // when
    renderWarning({ message: "No variable found with name 'customer'" });

    // then
    expect(screen.getByText('No Variable Found:').tagName).toBe('STRONG');
  });


  it('should not duplicate an existing no-variable prefix', () => {

    // when
    renderWarning({ message: "No Variable Found: No variable found with name 'customer'" });

    // then
    expect(screen.getByText(/No Variable Found:/).textContent).toBe('No Variable Found:');
    expect(screen.getByText(/No variable found with name/).textContent).toContain("No variable found with name 'customer'");
  });


  it('should format an invalid-type warning type provided by the host', () => {

    // when
    renderWarning({
      type: 'INVALID_TYPE',
      message: 'Can\'t add \'null\' to \'1\''
    });

    // then
    expect(screen.getByText('Invalid Type:').tagName).toBe('STRONG');
  });


  it('should format an invalid-type warning message provided by the host', () => {

    // when
    renderWarning({ message: 'Can\'t add \'null\' to \'1\'' });

    // then
    expect(screen.getByText('Invalid Type:').tagName).toBe('STRONG');
  });


  it('should show the result alongside host warnings', () => {

    // when
    renderWarning({ message: 'Result may be incomplete.' }, 42);

    // then
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Warning' })).toBeTruthy();
  });
});

function renderResult(state: PlaygroundState) {
  return render(<ResultView state={ state } />);
}

function renderWarning(
    warning: { type?: string; message: string },
    result: unknown = null
) {
  renderResult({ status: 'warning', result, warnings: [ warning ] });

  return within(screen.getByRole('img', { name: 'Warning' }).closest('section')!);
}
