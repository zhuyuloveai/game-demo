export type PointerKind = 'mouse' | 'touch' | 'pen';
/** x/y are client CSS pixels, independent of canvas layout and camera motion. */
export interface PointerSample { id: number; kind: PointerKind; x: number; y: number; }

/** Limit each gesture sample without banking idle time or queuing excess motion. */
export function capPointerMovement(x: number, y: number, maxSpeed: number, elapsedSeconds: number): { x: number; y: number } {
  const distance = Math.hypot(x, y);
  const limit = Math.max(0, maxSpeed) * Math.max(0, Math.min(1 / 30, elapsedSeconds));
  if (limit <= 0 || distance === 0) return { x: 0, y: 0 };
  if (distance <= limit) return { x, y };
  const scale = limit / distance;
  return { x: x * scale, y: y * scale };
}

/** Absolute samples anchor first; pointer-locked relative samples move immediately. */
export class PointerSteering {
  x = 0;
  y = 0;
  active = false;
  steering = false;
  held = false;
  kind: PointerKind = 'mouse';
  private pressedId: number | null = null;
  private lastId: number | null = null;
  private pendingX = 0;
  private pendingY = 0;

  down(sample: PointerSample): boolean {
    if (this.pressedId !== null && this.pressedId !== sample.id) return false;
    this.pressedId = sample.id;
    this.held = true;
    this.update(sample);
    return true;
  }
  move(sample: PointerSample): boolean {
    if (this.pressedId !== null && this.pressedId !== sample.id) return false;
    if (sample.kind !== 'mouse' && this.pressedId !== sample.id) return false;
    this.update(sample);
    return true;
  }
  /** Pointer Lock keeps client coordinates fixed and reports unbounded relative motion. */
  moveRelative(dx: number, dy: number): boolean {
    if (this.held && this.kind !== 'mouse') return false;
    this.kind = 'mouse';
    this.lastId = -1;
    this.active = true;
    this.steering = true;
    this.x += dx;
    this.y += dy;
    this.pendingX += dx;
    this.pendingY += dy;
    return true;
  }
  up(id: number): void {
    if (id !== this.pressedId) return;
    this.pressedId = null;
    this.held = false;
    if (this.kind !== 'mouse') this.reset();
  }
  cancel(id: number): void {
    if (id === this.pressedId) this.reset();
  }
  leave(kind: PointerKind): void {
    if (kind === 'mouse' && this.kind === 'mouse') this.reset();
  }
  stopSteering(): void {
    this.steering = false;
    this.pendingX = 0; this.pendingY = 0;
  }
  consumeDelta(): { x: number; y: number } {
    const delta = { x: this.pendingX, y: this.pendingY };
    this.pendingX = 0; this.pendingY = 0;
    return delta;
  }
  reset(): void {
    this.active = false;
    this.steering = false;
    this.held = false;
    this.pressedId = null;
    this.lastId = null;
    this.pendingX = 0; this.pendingY = 0;
  }
  private update(sample: PointerSample): void {
    if (this.active && this.steering && this.kind === sample.kind && this.lastId === sample.id) {
      this.pendingX += sample.x - this.x;
      this.pendingY += sample.y - this.y;
    }
    this.x = sample.x; this.y = sample.y; this.kind = sample.kind;
    this.lastId = sample.id;
    this.active = true; this.steering = true;
  }
}
