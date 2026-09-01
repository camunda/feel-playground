/**
 * jsdom does not implement Range measurement, which CodeMirror relies on to
 * size text. Without it, any editor that measures throws asynchronously.
 */
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = function() {
    return Object.assign([], { item: () => null }) as unknown as DOMRectList;
  };
}
