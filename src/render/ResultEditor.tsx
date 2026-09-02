import { useEffect, useRef } from 'react';

import { feelLight } from '@bpmn-io/cm-theme';
import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

interface ResultEditorProps {
  value: string;
}

export function ResultEditor({ value }: ResultEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const editor = new EditorView({
      parent: container,
      state: EditorState.create({
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
  }, [ value ]);

  return <div className="feel-playground__result-editor" ref={ containerRef } />;
}