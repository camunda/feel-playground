import { useEffect, useRef } from 'react';

import FeelEditor from '@bpmn-io/feel-editor';
import { lineNumbers } from '@codemirror/view';

import type { FeelDialect } from '../core';
import {
  DiagnosticList,
  type PlaygroundDiagnostic
} from './DiagnosticList';

export interface FeelVariable {
  name: string;
  detail?: string;
  info?: string;
  entries?: FeelVariable[];
}

export type FeelLintReport = PlaygroundDiagnostic;

interface ExpressionEditorProps {
  value: string;
  onChange(value: string): void;
  onValidityChange(valid: boolean): void;
  onErrorsChange(errors: FeelLintReport[]): void;
  errors: FeelLintReport[];
  dialect: FeelDialect;
  variables: FeelVariable[];
}

export function ExpressionEditor({
  value,
  onChange,
  onValidityChange,
  onErrorsChange,
  errors,
  dialect,
  variables
}: ExpressionEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<FeelEditor | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onValidityChangeRef = useRef(onValidityChange);
  const onErrorsChangeRef = useRef(onErrorsChange);

  onChangeRef.current = onChange;
  onValidityChangeRef.current = onValidityChange;
  onErrorsChangeRef.current = onErrorsChange;

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
        onChangeRef.current(nextValue);
      },
      onLint: reports => {
        const errors = reports.filter(isError);

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

  return (
    <>
      <div className="feel-playground__expression-editor" ref={containerRef} />
      <DiagnosticList
        diagnostics={errors}
        label="Expression errors"
        value={value}
        onSelect={position => editorRef.current?.focus(position)}
      />
    </>
  );
}

function isError(report: FeelLintReport) {
  return report.severity === 'error' || report.type === 'Syntax Error';
}