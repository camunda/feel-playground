import { describe, expect, it } from 'vitest';

import { addMissingContext } from '../src/core/contextCompleteness';

describe('contextCompleteness', () => {

  it('should add missing context', () => {

    // when
    const context = addMissingContext({
      customer: { id: 'C-123' }
    }, {
      customer: { name: null },
      total: null
    });

    // then
    expect(context).to.eql({
      customer: {
        id: 'C-123',
        name: null
      },
      total: null
    });
  });


  it('should expand null placeholders', () => {

    // when
    const context = addMissingContext({ customer: null }, {
      customer: { name: null }
    });

    // then
    expect(context).to.eql({
      customer: { name: null }
    });
  });


  it('should preserve conflicting values', () => {

    // when
    const context = addMissingContext({ customer: 'Jane' }, {
      customer: { name: null }
    });

    // then
    expect(context).toBeNull();
  });


  it('should return null when context is complete', () => {

    // when
    const context = addMissingContext({
      customer: { name: 'Jane' },
      total: 42
    }, {
      customer: { name: null },
      total: null
    });

    // then
    expect(context).toBeNull();
  });


  it('should add context matching inherited property names', () => {

    // when
    const context = addMissingContext({}, {
      constructor: null
    });

    // then
    expect(context).to.eql({
      constructor: null
    });
  });

});
