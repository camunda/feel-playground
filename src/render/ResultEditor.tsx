import { useEffect, useRef } from 'react';

import { EditorView } from '@codemirror/view';

import { createResultEditorState, syncEditorValue } from '../core/editorState';

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
      state: createResultEditorState(value)
    });

    editorRef.current = editor;

    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    syncEditorValue(editor, valueRef, value);
  }, [ value ]);

  return <div className="feel-playground__result-editor" ref={ containerRef } />;
}