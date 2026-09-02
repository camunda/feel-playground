import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { createPlaygroundController } from '../src/core/createPlaygroundController';
import type {
  Evaluate,
  PlaygroundInput
} from '../src/core/types';

const VALID_INPUT: PlaygroundInput = {
  expression: '1 + 1',
  expressionValid: true,
  context: '{}',
  dialect: 'expression'
};

describe('createPlaygroundController', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  it('should remain idle without an expression', () => {

    // given
    const onEvaluate = vi.fn();
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, expression: '', onEvaluate });

    // then
    expect(controller.getState()).to.eql({ status: 'idle' });
    expect(onEvaluate.mock.calls).to.be.empty;
  });


  it('should reject an invalid expression locally', () => {

    // given
    const onEvaluate = vi.fn();
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, expressionValid: false, onEvaluate });

    // then
    expect(controller.getState()).to.eql({ status: 'invalid-expression' });
    expect(onEvaluate.mock.calls).to.be.empty;
  });


  it('should wait for expression lint before evaluating', () => {

    // given
    const onEvaluate = vi.fn();
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, expressionValid: null, onEvaluate });

    // then
    expect(controller.getState()).to.eql({ status: 'validating-expression' });
    expect(onEvaluate.mock.calls).to.be.empty;
  });


  it('should reject malformed JSON context locally', () => {

    // given
    const onEvaluate = vi.fn();
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, context: '{', onEvaluate });

    // then
    expect(controller.getState()).to.include({ status: 'invalid-context' });
    expect(onEvaluate.mock.calls).to.be.empty;
  });


  it('should reject non-object JSON context locally', () => {

    // given
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, context: '[]' });

    // then
    expect(controller.getState()).to.eql({
      status: 'invalid-context',
      error: 'Context must be a JSON object.'
    });
  });


  it('should accept an empty context as an object', async () => {

    // given
    const onEvaluate = vi.fn().mockResolvedValue({ result: 2, warnings: [] });
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, context: '', onEvaluate });
    await vi.runAllTimersAsync();

    // then
    const [ input, options ] = onEvaluate.mock.calls[0];

    expect(input).to.eql({ expression: '1 + 1', context: {}, dialect: 'expression' });
    expect(options.signal).to.be.instanceOf(AbortSignal);
  });


  it('should show the default unavailable message without a host evaluator', () => {

    // given
    const controller = createPlaygroundController();

    // when
    controller.update(VALID_INPUT);

    // then
    expect(controller.getState()).to.eql({
      status: 'unavailable',
      message: 'Evaluation is unavailable.'
    });
  });


  it('should show the unavailable message provided by the host', () => {

    // given
    const controller = createPlaygroundController();

    // when
    controller.update({
      ...VALID_INPUT,
      evaluationUnavailable: 'Connect to a cluster to evaluate.'
    });

    // then
    expect(controller.getState()).to.eql({
      status: 'unavailable',
      message: 'Connect to a cluster to evaluate.'
    });
  });


  it('should schedule a valid evaluation', () => {

    // given
    const onEvaluate = vi.fn();
    const controller = createPlaygroundController();

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });

    // then
    expect(controller.getState()).to.eql({ status: 'scheduled' });
  });


  it('should show loading while the host evaluates', async () => {

    // given
    const onEvaluate: Evaluate = vi.fn(() => new Promise<never>(() => {}));
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });
    await vi.advanceTimersByTimeAsync(0);

    // then
    expect(controller.getState()).to.eql({ status: 'loading' });
  });


  it('should show a result returned by the host', async () => {

    // given
    const onEvaluate = vi.fn().mockResolvedValue({ result: { total: 2 }, warnings: [] });
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });
    await vi.runAllTimersAsync();

    // then
    expect(controller.getState()).to.eql({
      status: 'success',
      result: { total: 2 }
    });
  });


  it('should show warnings returned by the host', async () => {

    // given
    const warnings = [ { message: 'No variable found with name x' } ];
    const onEvaluate = vi.fn().mockResolvedValue({ result: null, warnings });
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });
    await vi.runAllTimersAsync();

    // then
    expect(controller.getState()).to.eql({
      status: 'warning',
      result: null,
      warnings
    });
  });


  it('should show an error thrown by the host', async () => {

    // given
    const onEvaluate = vi.fn().mockRejectedValue(new Error('Cluster unavailable.'));
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });
    await vi.runAllTimersAsync();

    // then
    expect(controller.getState()).to.eql({
      status: 'error',
      error: 'Cluster unavailable.'
    });
  });


  it('should show a fallback for a host failure without a message', async () => {

    // given
    const onEvaluate = vi.fn().mockRejectedValue(null);
    const controller = createPlaygroundController({ debounce: 0 });

    // when
    controller.update({ ...VALID_INPUT, onEvaluate });
    await vi.runAllTimersAsync();

    // then
    expect(controller.getState()).to.eql({
      status: 'error',
      error: 'Evaluation failed.'
    });
  });

});
