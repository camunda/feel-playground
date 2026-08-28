import { useEffect, useRef } from 'react';

import { feelLight } from '@bpmn-io/cm-theme';
import { json } from '@codemirror/lang-json';
import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import { DiagnosticList } from './DiagnosticList';
import { StatusIcon } from './StatusIcon';

interface ContextEditorProps {
  value: string;
  onChange(value: string): void;
  error?: string;
}

export function ContextEditor({ value, onChange, error }: ContextEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const attributesRef = useRef(new Compartment());

  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    valueRef.current = value;

    const editor = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          feelLight,
          json(),
          EditorView.lineWrapping,
          attributesRef.current.of(EditorView.contentAttributes.of({
            'aria-label': 'Evaluation context',
            'aria-invalid': String(Boolean(error))
          })),
          EditorView.updateListener.of(update => {
            if (!update.docChanged) {
              return;
            }

            const nextValue = update.state.doc.toString();
            valueRef.current = nextValue;
            onChangeRef.current(nextValue);
          })
        ]
      })
    });

    editorRef.current = editor;

    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || valueRef.current === value) {
      return;
    }

    valueRef.current = value;
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: value
      }
    });
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.dispatch({
      effects: attributesRef.current.reconfigure(EditorView.contentAttributes.of({
        'aria-label': 'Evaluation context',
        'aria-invalid': String(Boolean(error))
      }))
    });

    editor.dispatch(setDiagnostics(
      editor.state,
      error ? [createDiagnostic(error, editor.state.doc.length)] : []
    ));
  }, [error]);

  const diagnostics = error
    ? [createDiagnostic(error, value.length)]
    : [];

  const handleDiagnosticSelect = (position: number) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.dispatch({
      selection: { anchor: position },
      scrollIntoView: true
    });
    editor.focus();
  };

  return (
    <section className="feel-playground__section feel-playground__context">
      <div className="feel-playground__section-heading">
        <h3>Context</h3>
        {error && (
          <span className="feel-playground__error-count">
            <StatusIcon status="error" />
            1
          </span>
        )}
      </div>

      <div className="feel-playground__context-body">
        <div
          className="feel-playground__context-editor"
          ref={containerRef}
        />
        <DiagnosticList
          diagnostics={diagnostics}
          label="Context errors"
          value={value}
          onSelect={handleDiagnosticSelect}
        />
      </div>

      <p className="feel-playground__pane-hint">
        Add input variables as a JSON object.
      </p>
    </section>
  );
}

function createDiagnostic(error: string, documentLength: number): Diagnostic {
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
