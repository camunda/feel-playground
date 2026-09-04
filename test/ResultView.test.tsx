import {
  cleanup,
  render,
  screen
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it
} from 'vitest';

import type { PlaygroundState } from '../src/core/types';
import {
  formatResult,
  ResultView,
  Warning
} from '../src/render/ResultView';

afterEach(cleanup);

describe('<ResultView>', () => {

  it('should prompt for an expression while idle', () => {

    // when
    renderResult({ status: 'idle' });

    // then
    expect(screen.getByText('Enter an expression to evaluate.')).to.exist;
  });


  it('should prompt for valid input when the expression is invalid', () => {

    // when
    renderResult({ status: 'invalid-expression' });

    // then
    expect(screen.getByText('Fix the errors in your FEEL expression to evaluate it.')).to.exist;
    expect(screen.queryByRole('img')).not.to.exist;
  });


  it('should prompt for valid input while expression lint is pending', () => {

    // when
    renderResult({ status: 'validating-expression' });

    // then
    expect(screen.getByText('Evaluating…')).to.exist;
    expect(screen.getByRole('img', { name: 'Loading' })).to.exist;
  });


  it('should prompt for valid input when the context is invalid', () => {

    // when
    renderResult({ status: 'invalid-context', error: 'Invalid JSON' });

    // then
    expect(screen.getByText('Fix the errors in your context to evaluate the expression.')).to.exist;
    expect(screen.queryByRole('img')).not.to.exist;
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
    expect(screen.getByText('Fix the errors in your FEEL expression to evaluate it.')).to.exist;
    expect(screen.queryByText(/errors in your context/)).not.to.exist;
  });


  it('should show that evaluation is scheduled', () => {

    // when
    renderResult({ status: 'scheduled' });

    // then
    expect(screen.getByText('Evaluating…')).to.exist;
    expect(screen.getByRole('img', { name: 'Loading' })).to.exist;
  });


  it('should show that evaluation is loading', () => {

    // when
    renderResult({ status: 'loading' });

    // then
    expect(screen.getByText('Evaluating…')).to.exist;
    expect(screen.getByRole('img', { name: 'Loading' })).to.exist;
  });


  it('should show host unavailability as a warning', () => {

    // when
    renderResult({ status: 'unavailable', message: 'Connect to a cluster.' });

    // then
    expect(screen.getByText('Connect to a cluster.')).to.exist;
    expect(screen.getByRole('img', { name: 'Error' })).to.exist;
  });


  it('should format an object result', () => {

    // when
    const result = formatResult({ total: 2 });

    // then
    expect(result).to.equal('{\n  "total": 2\n}');
  });


  it('should not show a result without an evaluation result', () => {

    // when
    const { container } = renderResult({ status: 'loading' });

    // then
    expect(container.querySelector('.feel-playground__result-editor')).not.to.exist;
  });


  it('should format a string result with JSON quotes', () => {

    // when
    const result = formatResult('approved');

    // then
    expect(result).to.equal('"approved"');
  });


  it('should show an error provided by the host', () => {

    // when
    renderResult({ status: 'error', error: 'Request failed.' });

    // then
    expect(screen.getByText('Request failed.')).to.exist;
    expect(screen.getByRole('img', { name: 'Error' })).to.exist;
  });


  it('should show a generic host warning unchanged', () => {

    // when
    renderWarning({ message: 'Result may be incomplete.' });

    // then
    const warning = screen.getByText('Result may be incomplete.');
    expect(warning.querySelector('strong')).not.to.exist;
  });


  it('should format a no-variable warning type provided by the host', () => {

    // when
    renderWarning({
      type: 'NO_VARIABLE_FOUND',
      message: "No variable found with name 'customer'"
    });

    // then
    expect(screen.getByText('No Variable Found:').tagName).to.equal('STRONG');
  });


  it('should format a no-variable warning message provided by the host', () => {

    // when
    renderWarning({ message: "No variable found with name 'customer'" });

    // then
    expect(screen.getByText('No Variable Found:').tagName).to.equal('STRONG');
  });


  it('should not duplicate an existing no-variable prefix', () => {

    // when
    renderWarning({ message: "No Variable Found: No variable found with name 'customer'" });

    // then
    expect(screen.getByText(/No Variable Found:/).textContent).to.equal('No Variable Found:');
    expect(screen.getByText(/No variable found with name/).textContent).to.contain("No variable found with name 'customer'");
  });


  it('should format an invalid-type warning type provided by the host', () => {

    // when
    renderWarning({
      type: 'INVALID_TYPE',
      message: 'Can\'t add \'null\' to \'1\''
    });

    // then
    expect(screen.getByText('Invalid Type:').tagName).to.equal('STRONG');
  });


  it('should format an invalid-type warning message provided by the host', () => {

    // when
    renderWarning({ message: 'Can\'t add \'null\' to \'1\'' });

    // then
    expect(screen.getByText('Invalid Type:').tagName).to.equal('STRONG');
  });


});

function renderResult(state: PlaygroundState) {
  return render(<ResultView state={ state } />);
}

function renderWarning(warning: { type?: string; message: string }) {
  return render(<Warning warning={ warning } />);
}
