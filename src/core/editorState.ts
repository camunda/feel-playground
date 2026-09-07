import { feelLight } from '@bpmn-io/cm-theme';
import { snippet } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import {
  Compartment,
  EditorState,
  type TransactionSpec
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import { parseContext } from './parseContext';

interface ContextEditorStateOptions {
  value: string;
  error?: string;
  attributes: Compartment;
  onChange(value: string): void;
}

interface ControlledEditor {
  state: EditorState;
  dispatch(transaction: TransactionSpec): void;
}

interface ValueRef {
  current: string;
}

type SnippetEditor = Parameters<ReturnType<typeof snippet>>[0];

export function createContextEditorState({
  value,
  error,
  attributes,
  onChange
}: ContextEditorStateOptions): EditorState {
  let state = EditorState.create({
    doc: value,
    extensions: [
      basicSetup,
      feelLight,
      json(),
      EditorView.lineWrapping,
      formatContextPaste(),
      attributes.of(EditorView.contentAttributes.of(contextEditorAttributes(error))),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      })
    ]
  });

  if (error) {
    state = state.update(setDiagnostics(
      state,
      [ createContextDiagnostic(error, state.doc.length) ]
    )).state;
  }

  return state;
}

function formatContextPaste() {
  return EditorView.domEventHandlers({
    paste(event, editor) {
      const pastedText = event.clipboardData?.getData('text/plain');

      if (!pastedText) {
        return false;
      }

      const pasted = editor.state.update(
        editor.state.replaceSelection(pastedText),
        { filter: false, sequential: true }
      );
      let formattedContext: string;

      try {
        formattedContext = JSON.stringify(parseContext(pasted.newDoc.toString()), null, 2);
      } catch {
        return false;
      }

      const cursor = mapJsonPosition(
        pasted.newDoc.toString(),
        formattedContext,
        pasted.state.selection.main.anchor
      );

      event.preventDefault();
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: formattedContext
        },
        selection: { anchor: cursor },
        userEvent: 'input.paste',
        scrollIntoView: true
      });

      return true;
    }
  });
}

function mapJsonPosition(value: string, formattedValue: string, position: number): number {
  const offset = countSignificantCharacters(value, position);

  if (!offset) {
    return 0;
  }

  let significantCharacters = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < formattedValue.length; index++) {
    const character = formattedValue[index];

    if (!inString && /\s/.test(character)) {
      continue;
    }

    significantCharacters++;

    if (significantCharacters === offset) {
      return index + 1;
    }

    ({ inString, escaped } = updateStringState(character, inString, escaped));
  }

  return formattedValue.length;
}

function countSignificantCharacters(value: string, end: number): number {
  let significantCharacters = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < end; index++) {
    const character = value[index];

    if (!inString && /\s/.test(character)) {
      continue;
    }

    significantCharacters++;
    ({ inString, escaped } = updateStringState(character, inString, escaped));
  }

  return significantCharacters;
}

function updateStringState(character: string, inString: boolean, escaped: boolean) {
  if (!inString) {
    return {
      inString: character === '"',
      escaped: false
    };
  }

  if (escaped) {
    return { inString, escaped: false };
  }

  if (character === '\\') {
    return { inString, escaped: true };
  }

  return {
    inString: character !== '"',
    escaped: false
  };
}

export function createResultEditorState(value: string): EditorState {
  return EditorState.create({
    doc: value,
    extensions: [
      feelLight,
      json(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': 'Evaluation result',
        'aria-readonly': 'true',
        tabindex: '-1'
      })
    ]
  });
}

export function syncEditorValue(editor: ControlledEditor, valueRef: ValueRef, value: string): boolean {
  if (valueRef.current === value) {
    return false;
  }

  valueRef.current = value;
  editor.dispatch({
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: value
    }
  });

  return true;
}

export function insertContextTemplate(editor: SnippetEditor, template: string): void {
  snippet(template)(editor, null, 0, editor.state.doc.length);
}

export function contextEditorAttributes(error?: string): Record<string, string> {
  return {
    'aria-label': 'Evaluation context',
    'aria-invalid': String(Boolean(error))
  };
}

export function createContextDiagnostic(error: string, documentLength: number): Diagnostic {
  const position = Number(error.match(/position (\d+)/)?.[1]);
  const from = Number.isFinite(position)
    ? Math.min(position, documentLength)
    : 0;

  return {
    from,
    to: Math.min(from + 1, documentLength),
    severity: 'error',
    source: 'Context error',
    message: error.replace(/ at position \d+(?: \(line \d+ column \d+\))?$/, '')
  };
}