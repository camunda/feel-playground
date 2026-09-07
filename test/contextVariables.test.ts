import {
  describe,
  expect,
  it
} from 'vitest';

import { resolveAutocompleteVariables } from '../src/core/contextVariables';

describe('context variables', () => {

  it('should convert context values to FEEL variables', () => {

    // when
    const variables = resolveAutocompleteVariables(`{
      "customer": {
        "name": "Jane",
        "active": true
      },
      "orders": [ {
        "total": 42
      } ],
      "optional": null
    }`, []);

    // then
    expect(variables).to.eql([
      {
        name: 'customer',
        detail: 'Context',
        info: '{\n  "name": "Jane",\n  "active": true\n}',
        entries: [
          { name: 'name', detail: 'String', info: '"Jane"' },
          { name: 'active', detail: 'Boolean', info: 'true' }
        ]
      },
      {
        name: 'orders',
        detail: 'List',
        info: '[\n  {\n    "total": 42\n  }\n]',
        isList: true,
        entries: [
          { name: 'total', detail: 'Number', info: '42' }
        ]
      },
      { name: 'optional', detail: 'Null', info: 'null' }
    ]);
  });


  it('should merge context and host variables', () => {

    // given
    const variables = [ {
      name: 'customer',
      detail: 'Context',
      entries: [
        { name: 'id', detail: 'String' }
      ]
    }, {
      name: 'processVariable',
      detail: 'Number'
    } ];

    // when
    const merged = resolveAutocompleteVariables(`{
      "customer": {
        "name": "Jane"
      },
      "contextVariable": true
    }`, variables);

    // then
    expect(merged).to.eql([
      {
        name: 'customer',
        detail: 'Context',
        info: '{\n  "name": "Jane"\n}',
        entries: [
          { name: 'id', detail: 'String' },
          { name: 'name', detail: 'String', info: '"Jane"' }
        ]
      },
      { name: 'processVariable', detail: 'Number' },
      { name: 'contextVariable', detail: 'Boolean', info: 'true' }
    ]);
  });


  it('should keep host variables when context is invalid', () => {

    // given
    const variables = [ { name: 'customer', detail: 'Context' } ];

    // when
    const resolved = resolveAutocompleteVariables('{', variables);

    // then
    expect(resolved).to.equal(variables);
  });

});
