import { useEffect, useRef } from 'react';

import FeelEditor from '@bpmn-io/feel-editor';
import { lineNumbers } from '@codemirror/view';

import type { FeelDialect } from '../core';

export interface FeelVariable {
  name: string;
  detail?: string;
  info?: string;
  entries?: FeelVariable[];
}

interface ExpressionEditorProps {
  value: string;
  onChange(value: string): void;
  dialect: FeelDialect;
  variables: FeelVariable[];
}

export function ExpressionEditor({
  value,
  onChange,
  dialect,
  variables
}: ExpressionEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<FeelEditor | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    valueRef.current = value;

    const editor = new FeelEditor({
      container,
      contentAttributes: {
        'aria-label': 'FEEL expression'
      },
      dialect,
      extensions: [lineNumbers()],
      onChange: nextValue => {
        valueRef.current = nextValue;
        onChange(nextValue);
      },
      value,
      variables
    });

    editorRef.current = editor;

    return () => {
      editorRef.current = null;
      container.replaceChildren();
    };
  }, [dialect, onChange]);

  useEffect(() => {
    if (!editorRef.current || valueRef.current === value) {
      return;
    }

    valueRef.current = value;
    editorRef.current.setValue(value);
  }, [value]);

  useEffect(() => {
    editorRef.current?.setVariables(variables);
  }, [variables]);

  return <div className="feel-playground__expression-editor" ref={containerRef} />;
}