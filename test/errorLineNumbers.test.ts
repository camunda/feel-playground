import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { afterEach, describe, expect, it } from 'vitest';

import { createErrorLineNumbers } from '../src/render/errorLineNumbers';

let editor: EditorView | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('error line numbers', () => {

  it('should mark line numbers containing errors', () => {
    // given
    const errorLineNumbers = createErrorLineNumbers();
    editor = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: 'first\nsecond\nthird',
        extensions: [lineNumbers(), errorLineNumbers.extension]
      })
    });

    // when
    errorLineNumbers.update([7, 9, 13]);

    // then
    const markedLines = editor.dom.querySelectorAll('.feel-playground__error-line-number');
    expect([ ...markedLines ].map(line => line.textContent)).toEqual([ '2', '3' ]);
  });


  it('should clear marked line numbers', () => {
    // given
    const errorLineNumbers = createErrorLineNumbers();
    editor = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: 'first\nsecond',
        extensions: [lineNumbers(), errorLineNumbers.extension]
      })
    });
    errorLineNumbers.update([7]);

    // when
    errorLineNumbers.update([]);

    // then
    expect(editor.dom.querySelector('.feel-playground__error-line-number')).toBeNull();
  });
});