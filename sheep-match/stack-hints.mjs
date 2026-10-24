// Presentation only. Keep the logical coordinates, covering rules and hit boxes
// in engine.mjs unchanged; these hints contain counts, never hidden tile faces.
// Normal generated quarter-cell staggering already exposes the lower card.
const NEAR = .125 + 1e-9;
export const STACK_EDGE_STEP = 3;
export const MAX_STACK_EDGES = 4;
export const STACK_GUTTER = MAX_STACK_EDGES * STACK_EDGE_STEP + 4;
const aligned = (a, b) => Math.abs(a.x - b.x) <= NEAR && Math.abs(a.y - b.y) <= NEAR;

export function stackHints(board, visibleIds = null) {
  const hints = new Map();
  for (const tile of board) {
    // Covered anchors would scatter counts over other stacks. Reveal their
    // hint when they become selectable, using the engine-provided free set.
    if (visibleIds && !visibleIds.has(tile.id)) continue;
    // Only the highest near-aligned tile labels this pile. A normal staggered
    // overlap is not folded into the count, nor are same-layer neighbours.
    if (board.some(other => other.z > tile.z && aligned(tile, other))) continue;
    const count = board.filter(other => other.z < tile.z && aligned(tile, other)).length;
    if (count) hints.set(tile.id, {count, edges:Math.min(count, MAX_STACK_EDGES)});
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
    edge.style.setProperty('--stack-step', step);
    decoration.append(edge);
  }
  const count = doc.createElement('span');
  count.className = 'stack-count';
  count.textContent = `下${hint.count}`;
  decoration.append(count);
  button.append(decoration);
}
