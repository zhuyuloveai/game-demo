import { segmentCircle } from './math.ts';

interface Point { x: number; y: number; }
interface AttackTarget extends Point { id: number; active: boolean; spawn: number; radius: number; }
const live = (target: AttackTarget) => target.active && target.spawn <= 0;

/** Pierce in spatial order, independent of enemy pool reuse order. */
export function beamTargets<T extends AttackTarget>(origin: Point, angle: number, range: number,
  width: number, pierce: number, enemies: readonly T[]): T[] {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  return enemies.filter(e => live(e) && segmentCircle(origin.x, origin.y,
    origin.x + dx * range, origin.y + dy * range, e.x, e.y, e.radius + width))
    .sort((a, b) => ((a.x - origin.x) * dx + (a.y - origin.y) * dy)
      - ((b.x - origin.x) * dx + (b.y - origin.y) * dy))
    .slice(0, Math.max(0, Math.floor(pierce)));
}

/** The initial target must be in hand range; later jumps have their own range. */
export function chainTargets<T extends AttackTarget>(origin: Point, firstId: number, range: number,
  jumps: number, jumpRange: number, enemies: readonly T[]): T[] {
  const first = enemies.find(e => e.id === firstId && live(e) && Math.hypot(e.x - origin.x, e.y - origin.y) <= range);
  if (!first || jumps < 1) return [];
  const result = [first], visited = new Set([first.id]);
  while (result.length < jumps) {
    const previous = result[result.length - 1];
    let next: T | undefined, distance = jumpRange ** 2;
    for (const e of enemies) {
      if (!live(e) || visited.has(e.id)) continue;
      const d = (e.x - previous.x) ** 2 + (e.y - previous.y) ** 2;
      if (d <= distance) { next = e; distance = d; }
    }
    if (!next) break;
    result.push(next); visited.add(next.id);
  }
  return result;
}

/** A blast touches the target's edge, not just its center. */
export function blastTargets<T extends AttackTarget>(center: Point, radius: number, enemies: readonly T[]): T[] {
  return enemies.filter(e => live(e) && Math.hypot(e.x - center.x, e.y - center.y) <= radius + e.radius);
}
