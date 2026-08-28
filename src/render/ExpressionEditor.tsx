import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';

import FeelEditor from '@bpmn-io/feel-editor';
import { lineNumbers } from '@codemirror/view';

import type { FeelDialect } from '../core';
import type { PlaygroundDiagnostic } from './DiagnosticList';
import { createErrorLineNumbers } from './errorLineNumbers';

export interface FeelVariable {
  name: string;
  detail?: string;
  info?: string;
  entries?: FeelVariable[];
}

export type FeelLintReport = PlaygroundDiagnostic;

export interface ExpressionEditorHandle {
  focus(position: number): void;
}

interface ExpressionEditorProps {
  value: string;
  onChange(value: string): void;
  onValidityChange(valid: boolean): void;
  onErrorsChange(errors: FeelLintReport[]): void;
  dialect: FeelDialect;
  variables: FeelVariable[];
}

export const ExpressionEditor = forwardRef<ExpressionEditorHandle, ExpressionEditorProps>(function ExpressionEditor({
  value,
  onChange,
  onValidityChange,
  onErrorsChange,
  dialect,
  variables
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<FeelEditor | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onValidityChangeRef = useRef(onValidityChange);
  const onErrorsChangeRef = useRef(onErrorsChange);

  onChangeRef.current = onChange;
  onValidityChangeRef.current = onValidityChange;
  onErrorsChangeRef.current = onErrorsChange;

  useImperativeHandle(ref, () => ({
    focus: position => editorRef.current?.focus(position)
  }), []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    valueRef.current = value;
    const errorLineNumbers = createErrorLineNumbers();

    const editor = new FeelEditor({
      container,
      contentAttributes: {
        'aria-label': 'FEEL expression'
      },
      dialect,
      extensions: [lineNumbers(), errorLineNumbers.extension],
      onChange: nextValue => {
        valueRef.current = nextValue;
        errorLineNumbers.update([]);
        onChangeRef.current(nextValue);
      },
      onLint: reports => {
        const errors = reports.filter(isError);

        errorLineNumbers.update(errors.map(error => error.from));
        onErrorsChangeRef.current(errors);
        onValidityChangeRef.current(errors.length === 0);
      },
      value,
      variables
    });

    editorRef.current = editor;

    return () => {
      editorRef.current = null;
      container.replaceChildren();
    };
  }, [dialect]);

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
});

function isError(report: FeelLintReport) {
  return report.severity === 'error' || report.type === 'Syntax Error';
}