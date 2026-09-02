import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@camunda/design-system';
import { setDiagnostics } from '@codemirror/lint';
import { Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import {
  contextEditorAttributes,
  createContextDiagnostic,
  createContextEditorState,
  insertContextTemplate,
  syncEditorValue
} from '../core/editorState';
import { DiagnosticList } from './DiagnosticList';
import { StatusIcon } from './StatusIcon';

export interface ContextEditorHandle {

  /**
   * Replace the context with a snippet template, activating its tab stops.
   */
  insertTemplate(template: string, options?: { focus?: boolean }): void;
}

interface ContextEditorProps {
  value: string;
  onChange(value: string): void;
  onReset?(): void;
  error?: string;
  ref?: Ref<ContextEditorHandle>;
}

export function ContextEditor({ value, onChange, onReset, error, ref }: ContextEditorProps) {
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
      state: createContextEditorState({
        value,
        error,
        attributes: attributesRef.current,
        onChange: nextValue => {
          valueRef.current = nextValue;
          onChangeRef.current(nextValue);
        }
      })
    });

    editorRef.current = editor;

    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    insertTemplate(template, options = {}) {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      // the update listener syncs valueRef and notifies the host, so the
      // value effect below will not overwrite the snippet
      insertContextTemplate(editor, template);

      if (options.focus) {
        editor.focus();
      }
    }
  }), []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    syncEditorValue(editor, valueRef, value);
  }, [ value ]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.dispatch({
      effects: attributesRef.current.reconfigure(
        EditorView.contentAttributes.of(contextEditorAttributes(error))
      )
    });

    editor.dispatch(setDiagnostics(
      editor.state,
      error ? [ createContextDiagnostic(error, editor.state.doc.length) ] : []
    ));
  }, [ error ]);

  const diagnostics = error
    ? [ createContextDiagnostic(error, value.length) ]
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
        <div className="feel-playground__section-heading-actions">
          {onReset && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Reset to prefilled context"
                  size="icon-xs"
                  variant="ghost"
                  onClick={ onReset }
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 12a9 9 0 1 0 3-7.7L3 7" />
                    <path d="M3 3v4h4" />
                  </svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="feel-playground__context-reset-tooltip">
                Reset to prefilled context
              </TooltipContent>
            </Tooltip>
          )}
          {error && (
            <span className="feel-playground__error-count">
              <StatusIcon status="error" />
              1
            </span>
          )}
        </div>
      </div>

      <div className="feel-playground__context-body">
        <div
          className="feel-playground__context-editor"
          ref={ containerRef }
        />
        <DiagnosticList
          diagnostics={ diagnostics }
          label="Context errors"
          value={ value }
          onSelect={ handleDiagnosticSelect }
        />
      </div>

      <p className="feel-playground__pane-hint">
        Add input variables as a JSON object.
      </p>
    </section>
  );
}
