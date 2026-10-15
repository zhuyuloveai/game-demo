import type { AvatarExpression } from '../shared.ts';

interface Position { x: number; y: number; }
interface Threat extends Position { active: boolean; radius: number; kind: string; spawn: number; }

/** Edge-to-edge distance, with a wider release range to avoid boundary flicker. */
export function hasNearbyThreat(player: Position, enemies: readonly Threat[], wasNearby: boolean): boolean {
  const gap = wasNearby ? 88 : 64;
  for (const enemy of enemies) {
    if (!enemy.active || enemy.spawn > 0 || enemy.kind === 'dummy') continue;
    const range = 15 + enemy.radius + gap;
    if ((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2 <= range * range) return true;
  }
  return false;
}

/** Nearby threats outrank attack/celebration; hurt feedback and explicit previews win. */
export function resolveAvatarExpression(expression: AvatarExpression, nearby: boolean, preview: boolean): AvatarExpression {
  return !preview && nearby && expression !== 'panic' ? 'furious' : expression;
}
