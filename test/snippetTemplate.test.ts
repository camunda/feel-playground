import { describe, expect, it } from 'vitest';

import { toSnippetTemplate } from '../src/core/snippetTemplate';

describe('snippet template', () => {

  it('should turn null leaves into numbered tab stops', () => {
    // given
    const context = { customer: null, orderTotal: null };

    // when
    const template = toSnippetTemplate(context);

    // then
    expect(template).to.equal(
      '{\n  "customer": ${1:null},\n  "orderTotal": ${2:null}\n}${0}'
    );
  });


  it('should number nested leaves', () => {
    // given
    const context = { customer: { id: null, name: null } };

    // when
    const template = toSnippetTemplate(context);

    // then
    expect(template).to.equal(
      '{\n  "customer": {\n    "id": ${1:null},\n    "name": ${2:null}\n  }\n}${0}'
    );
  });


  it('should keep known values', () => {
    // given
    const context = { count: 2, name: 'foo', done: true, missing: null };

    // when
    const template = toSnippetTemplate(context);

    // then
    expect(template).to.equal(
      '{\n  "count": 2,\n  "name": "foo",\n  "done": true,\n  "missing": ${1:null}\n}${0}'
    );
  });


  it('should handle an empty context', () => {
    // when
    const template = toSnippetTemplate({});

    // then
    expect(template).to.equal('{}${0}');
  });


  it('should handle lists', () => {
    // given
    const context = { orders: [ { id: null } ], empty: [] };

    // when
    const template = toSnippetTemplate(context);

    // then
    expect(template).to.equal(
      '{\n  "orders": [\n    {\n      "id": ${1:null}\n    }\n  ],\n  "empty": []\n}${0}'
    );
  });


  it('should not read literal text as a placeholder', () => {
    // given
    const context = { 'a${b}': '#{c}' };

    // when
    const template = toSnippetTemplate(context);

    // then
    expect(template).to.equal('{\n  "a$\\{b}": "#\\{c}"\n}${0}');
  });

});
