import { nextSnippetField } from '@codemirror/autocomplete';
import { forEachDiagnostic } from '@codemirror/lint';
import { Compartment, EditorState, type TransactionSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, it, vi } from 'vitest';

import { toSnippetTemplate } from '../src/core/snippetTemplate';
import {
  createContextEditorState,
  createResultEditorState,
  insertContextTemplate,
  syncEditorValue
} from '../src/core/editorState';

describe('editor state', () => {

  it('should set the initial context value', () => {

    // when
    const state = createContextEditorState({
      value: '{',
      attributes: new Compartment(),
      onChange: () => {}
    });

    // then
    expect(state.doc.toString()).to.equal('{');
  });


  it('should configure context content attributes', () => {

    // when
    const state = createContextEditorState({
      value: '',
      error: 'Invalid JSON',
      attributes: new Compartment(),
      onChange: () => {}
    });

    // then
    expect(state.facet(EditorView.contentAttributes)).to.deep.include({
      'aria-label': 'Evaluation context',
      'aria-invalid': 'true'
    });
  });


  it('should configure context diagnostics', () => {

    // when
    const state = createContextEditorState({
      value: '{',
      error: 'Invalid JSON at position 1 (line 1 column 2)',
      attributes: new Compartment(),
      onChange: () => {}
    });
    const diagnostics: { from: number; to: number; message: string }[] = [];
    forEachDiagnostic(state, diagnostic => diagnostics.push(diagnostic));

    // then
    expect(diagnostics).to.eql([ {
      from: 1,
      to: 1,
      message: 'Invalid JSON',
      severity: 'error',
      source: 'Context error'
    } ]);
  });


  it('should set the initial result value', () => {

    // when
    const state = createResultEditorState('{ "total": 2 }');

    // then
    expect(state.doc.toString()).to.equal('{ "total": 2 }');
  });


  it('should configure the result editor as read-only', () => {

    // when
    const state = createResultEditorState('{ "total": 2 }');

    // then
    expect(state.facet(EditorState.readOnly)).to.equal(true);
    expect(state.facet(EditorView.editable)).to.equal(false);
  });


  it('should configure result content attributes', () => {

    // when
    const state = createResultEditorState('{ "total": 2 }');

    // then
    expect(state.facet(EditorView.contentAttributes)).to.deep.include({
      'aria-label': 'Evaluation result',
      'aria-readonly': 'true',
      tabindex: '-1'
    });
  });


  it('should insert and navigate a context snippet', () => {

    // given
    let state = EditorState.create();
    const editor = {
      get state() {
        return state;
      },
      dispatch(transaction: TransactionSpec) {
        state = state.update(transaction).state;
      }
    };

    // when
    insertContextTemplate(editor, toSnippetTemplate({ base: null, protocol: null }));
    const firstSelection = selectedText(state);
    nextSnippetField(editor);
    const secondSelection = selectedText(state);
    nextSnippetField(editor);

    // then
    expect(state.doc.toString()).to.equal('{\n  "base": null,\n  "protocol": null\n}');
    expect(firstSelection).to.equal('null');
    expect(secondSelection).to.equal('null');
    expect(state.selection.main.from).to.equal(state.doc.length);
  });


  it('should not dispatch a controlled value that is already current', () => {

    // given
    const state = EditorState.create({ doc: 'current' });
    const dispatch = vi.fn();

    // when
    const changed = syncEditorValue(
      { state, dispatch },
      { current: 'current' },
      'current'
    );

    // then
    expect(changed).to.equal(false);
    expect(dispatch.mock.calls).to.be.empty;
  });


  it('should dispatch a changed controlled value', () => {

    // given
    let state = EditorState.create({ doc: 'before' });
    const editor = {
      get state() {
        return state;
      },
      dispatch(transaction: TransactionSpec) {
        state = state.update(transaction).state;
      }
    };
    const valueRef = { current: 'before' };

    // when
    const changed = syncEditorValue(editor, valueRef, 'after');

    // then
    expect(changed).to.equal(true);
    expect(valueRef.current).to.equal('after');
    expect(state.doc.toString()).to.equal('after');
  });
});

function selectedText(state: EditorState): string {
  return state.sliceDoc(state.selection.main.from, state.selection.main.to);
}