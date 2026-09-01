import { describe, expect, it } from 'vitest';

import { resolveEvaluationContext } from '../src/core/resolveEvaluationContext';

describe('resolveEvaluationContext', () => {

  it('should project known variables onto referenced paths', () => {

    // when
    const context = resolveEvaluationContext({
      expression: 'customer.name',
      variables: [ {
        name: 'customer',
        entries: [ { name: 'id' }, { name: 'name' } ]
      }, {
        name: 'order'
      } ]
    });

    // then
    expect(context).toEqual({
      customer: {
        name: null
      }
    });
  });


  it('should retain known structure when referencing a whole variable', () => {

    // when
    const context = resolveEvaluationContext({
      expression: 'customer',
      variables: [ {
        name: 'customer',
        entries: [ { name: 'id' }, { name: 'name' } ]
      } ]
    });

    // then
    expect(context).toEqual({
      customer: {
        id: null,
        name: null
      }
    });
  });


  it('should add unresolved referenced variables', () => {

    // when
    const context = resolveEvaluationContext({
      expression: 'customer.name and orderTotal > 10'
    });

    // then
    expect(context).toEqual({
      customer: {
        name: null
      },
      orderTotal: null
    });
  });


  it('should exclude functions and scoped iteration variables', () => {

    // when
    const context = resolveEvaluationContext({
      expression: 'for order in orders return string length(order.id)'
    });

    // then
    expect(context).toEqual({
      orders: null
    });
  });


  it('should return all known variables without an expression', () => {

    // when
    const context = resolveEvaluationContext({
      expression: '',
      variables: [ { name: 'customer' }, { name: 'order' } ]
    });

    // then
    expect(context).toEqual({
      customer: null,
      order: null
    });
  });

});