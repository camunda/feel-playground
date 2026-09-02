import {
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
  type Text
} from '@codemirror/state';
import {
  EditorView,
  GutterMarker,
  lineNumberMarkers,
  ViewPlugin
} from '@codemirror/view';

const setErrorLines = StateEffect.define<readonly number[]>();

class ErrorLineMarker extends GutterMarker {
  elementClass = 'feel-playground__error-line-number';
}

const errorLineMarker = new ErrorLineMarker();

const errorLines = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(markers, transaction) {
    markers = markers.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(setErrorLines)) {
        return createMarkers(transaction.state.doc, effect.value);
      }
    }

    return markers;
  },
  provide: field => lineNumberMarkers.from(field)
});

export function createErrorLineNumbers(): {
  extension: Extension;
  update(positions: readonly number[]): void;
  } {
  let view: EditorView | null = null;

  const viewBridge = ViewPlugin.fromClass(class {
    constructor(editorView: EditorView) {
      view = editorView;
    }

    destroy() {
      view = null;
    }
  });

  return {
    extension: [ errorLines, viewBridge ],
    update(positions) {
      view?.dispatch({ effects: setErrorLines.of(positions) });
    }
  };
}

function createMarkers(document: Text, positions: readonly number[]) {
  const lineStarts = getErrorLineStarts(document, positions);
  const markers = new RangeSetBuilder<GutterMarker>();

  for (const lineStart of lineStarts) {
    markers.add(lineStart, lineStart, errorLineMarker);
  }

  return markers.finish();
}

export function getErrorLineStarts(document: Text, positions: readonly number[]): number[] {
  return [
    ...new Set(positions.map(position => document.lineAt(
      Math.min(document.length, Math.max(0, position))
    ).from))
  ].sort((a, b) => a - b);
}