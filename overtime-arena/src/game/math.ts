export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export function normaliseInput(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}
export function angleDifference(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
/** Continuous collision check: a fast projectile cannot jump over a target. */
export function segmentCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, radius: number): boolean {
  const dx = bx - ax, dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(((cx - ax) * dx + (cy - ay) * dy) / length, 0, 1) : 0;
  return (ax + t * dx - cx) ** 2 + (ay + t * dy - cy) ** 2 <= radius ** 2;
}
export interface Positioned { x: number; y: number; active: boolean; }
export class SpatialHash<T extends Positioned> {
  private cells = new Map<number, T[]>();
  private cellSize: number;
  constructor(cellSize = 80) { this.cellSize = cellSize; }
  rebuild(items: T[]): void {
    for (const list of this.cells.values()) list.length = 0;
    for (const item of items) {
      if (!item.active) continue;
      const key = Math.floor(item.x / this.cellSize) + Math.floor(item.y / this.cellSize) * 10000;
      const list = this.cells.get(key);
      if (list) list.push(item); else this.cells.set(key, [item]);
    }
  }
  query(x: number, y: number, radius: number, result: T[]): T[] {
    result.length = 0;
    const minX = Math.floor((x - radius) / this.cellSize), maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize), maxY = Math.floor((y + radius) / this.cellSize);
    for (let gy = minY; gy <= maxY; gy++) for (let gx = minX; gx <= maxX; gx++) {
      const list = this.cells.get(gx + gy * 10000);
      if (list) for (const item of list) if (item.active) result.push(item);
    }
    return result;
  }
}
