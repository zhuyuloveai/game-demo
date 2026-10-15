export const VIEWPORT = { width: 1120, height: 720 } as const;
export const WORLD = { width: VIEWPORT.width * 2, height: VIEWPORT.height * 2 } as const;
export const WORLD_CENTER = { x: WORLD.width / 2, y: WORLD.height / 2 } as const;
export const WORLD_BOUNDS = { left: 75, right: WORLD.width - 75, top: 75, bottom: WORLD.height - 75 } as const;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Keep screen scale unchanged and stop the following camera at the map perimeter. */
export function cameraScrollFor(x: number, y: number): { x: number; y: number } {
  return { x: clamp(x - VIEWPORT.width / 2, 0, WORLD.width - VIEWPORT.width),
    y: clamp(y - VIEWPORT.height / 2, 0, WORLD.height - VIEWPORT.height) };
}

/** Spawn around the visible perimeter, always inside the world and away from the player. */
export function enemySpawnPoint(player: { x: number; y: number }, radius: number, random = Math.random): { x: number; y: number } {
  const view = cameraScrollFor(player.x, player.y);
  const margin = Math.max(20, radius + 10);
  const roll = () => clamp(random(), 0, 1 - Number.EPSILON);
  const left = Math.max(WORLD_BOUNDS.left + radius, view.x + margin);
  const right = Math.min(WORLD_BOUNDS.right - radius, view.x + VIEWPORT.width - margin);
  const top = Math.max(WORLD_BOUNDS.top + radius, view.y + margin);
  const bottom = Math.min(WORLD_BOUNDS.bottom - radius, view.y + VIEWPORT.height - margin);
  for (let attempt = 0; attempt < 12; attempt++) {
    const edge = Math.floor(roll() * 4);
    const x = edge === 0 ? left : edge === 1 ? right : left + roll() * (right - left);
    const y = edge === 2 ? top : edge === 3 ? bottom : top + roll() * (bottom - top);
    if (Math.hypot(x - player.x, y - player.y) >= 290 + radius) return { x, y };
  }
  // The farthest visible corner remains safe even when random samples repeatedly fail.
  return [{ x: left, y: top }, { x: right, y: top }, { x: left, y: bottom }, { x: right, y: bottom }]
    .sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y))[0];
}
