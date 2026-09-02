import { Text } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { getErrorLineStarts } from '../src/render/errorLineNumbers';

describe('error line numbers', () => {

  it('should find unique lines containing errors', () => {

    // given
    const document = Text.of([ 'first', 'second', 'third' ]);

    // when
    const lineStarts = getErrorLineStarts(document, [ 7, 9, 13 ]);

    // then
    expect(lineStarts).to.eql([ 6, 13 ]);
  });


  it('should return no lines without errors', () => {

    // given
    const document = Text.of([ 'first', 'second' ]);

    // when
    const lineStarts = getErrorLineStarts(document, []);

    // then
    expect(lineStarts).to.eql([]);
  });
});