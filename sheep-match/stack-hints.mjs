// Presentation only. Keep the logical coordinates, covering rules and hit boxes
// in engine.mjs unchanged; these hints expose neutral edges, never hidden tile faces.
// Normal generated quarter-cell staggering already exposes the lower card.
const NEAR = .125 + 1e-9;
export const STACK_EDGE_STEP = 3;
export const STACK_MAX_SPREAD = 12;
export const STACK_GUTTER = STACK_MAX_SPREAD + 4;
const aligned = (a, b) => Math.abs(a.x - b.x) <= NEAR && Math.abs(a.y - b.y) <= NEAR;

export function stackHints(board, visibleIds = null) {
  const hints = new Map();
  for (const tile of board) {
    // Covered anchors would scatter hints over other stacks. Reveal their
    // hint when they become selectable, using the engine-provided free set.
    if (visibleIds && !visibleIds.has(tile.id)) continue;
    // Only the highest near-aligned tile marks this pile. A normal staggered
    // overlap is not folded into the count, nor are same-layer neighbours.
    if (board.some(other => other.z > tile.z && aligned(tile, other))) continue;
    const count = board.filter(other => other.z < tile.z && aligned(tile, other)).length;
    if (count) hints.set(tile.id, {count, edges:count});
  }
  return hints;
}

export function boardSize(fieldWidth, fieldHeight) {
  const width = Math.max(0, Math.min(fieldWidth - STACK_GUTTER * 2, (fieldHeight - 8) * 7 / 6.5));
  return {width, height:width * 6.5 / 7};
}

export function appendStackHint(button, hint, doc = document) {
  if (!hint) return;
  button.dataset.stackCount = String(hint.count);
  const decoration = doc.createElement('span');
  decoration.className = 'stack-hint';
  decoration.setAttribute('aria-hidden', 'true');
  for (let step = hint.edges; step >= 1; step--) {
    const edge = doc.createElement('span');
    edge.className = 'stack-edge';
    edge.style.setProperty('--stack-offset', `${step * Math.min(STACK_EDGE_STEP, STACK_MAX_SPREAD / hint.edges)}px`);
    edge.style.setProperty('--stack-inset', `${step / hint.edges * Math.min(hint.edges, 4)}px`);
    decoration.append(edge);
  }
  button.append(decoration);
}
