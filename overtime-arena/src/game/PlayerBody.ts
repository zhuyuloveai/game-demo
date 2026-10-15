import Phaser from 'phaser';
import type { WeaponId } from '../shared';
import { PlayerMotion, type PlayerMotionInput, type PlayerPose } from './PlayerMotion';
import { WEAPON_SLOTS, weaponGrip } from './WeaponRig';

const INK = 0x262a3e;
const SHIRT = 0xfffbef;
const SKIN = 0xf5bc91;
type Point = { x: number; y: number };

export interface PlayerArmInput {
  slot: number;
  angle: number;
  recoil: number;
  swing: number;
}

export interface PlayerGrip extends Point {
  slot: number;
  angle: number;
  depth: number;
}

export interface PlayerHeadAnchor extends Point {
  tilt: number;
  scale: number;
}

export interface PlayerBodyAnchors {
  headX: number;
  headY: number;
  headTilt: number;
  headScaleX: number;
  headScaleY: number;
  weaponX: number;
  weaponY: number;
  shadowScale: number;
  moving: boolean;
  directionX: number;
  grips: PlayerGrip[];
  heads: PlayerHeadAnchor[];
}

/** Three heads and six independent arms share the same live simulation anchor. */
export class PlayerBody {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly motion = new PlayerMotion();

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(16);
  }

  reset(x: number, y: number): void { this.motion.reset(x, y); }
  // Most attack motion belongs to the firing hand; the torso gives a small common response.
  attack(weapon: WeaponId, angle: number): void { this.motion.attack(weapon, angle, 0.28); }
  hurt(angle: number): void { this.motion.hurt(angle); }

  update(input: PlayerMotionInput & { arms: readonly PlayerArmInput[] }): PlayerBodyAnchors {
    const pose = this.motion.update(input);
    const g = this.graphics;
    g.clear().setPosition(input.x, input.y).setAlpha(input.alpha);
    const transform = (x: number, y: number): Point => {
      const sx = x * pose.scaleX, sy = y * pose.scaleY;
      return { x: pose.offsetX + sx * Math.cos(pose.lean) - sy * Math.sin(pose.lean),
        y: pose.offsetY + sx * Math.sin(pose.lean) + sy * Math.cos(pose.lean) };
    };
    const left = this.foot(-1, pose);
    const right = this.foot(1, pose);
    // The foot nearer the camera is painted last so crossing strides remain readable.
    const feet = left.y < right.y ? [left, right] : [right, left];
    for (const foot of feet) {
      const hip = transform(foot.side * 6, 15);
      const knee = { x: (hip.x + foot.x) * 0.5 + pose.directionX * pose.stride * 2.5,
        y: (hip.y + foot.y) * 0.5 - foot.lift * 0.24 };
      this.limb(hip, knee, 9.4, foot.side === -1 ? 0x344054 : 0x435064);
      this.limb(knee, foot, 8, foot.side === -1 ? 0x2a3346 : 0x344054);
      const toe = Math.abs(pose.directionX) > 0.2 ? Math.sign(pose.directionX) : foot.side;
      g.fillStyle(INK).fillEllipse(foot.x + toe * 2, foot.y, 15, 6.5);
      g.lineStyle(1.2, 0x8c98a5).lineBetween(foot.x - 4, foot.y + 1.6, foot.x + 5, foot.y + 1.6);
    }

    const arms = WEAPON_SLOTS.map((config, slot) => {
      const source = input.arms.find(arm => arm.slot === slot);
      const side = config.side;
      const row = Math.floor(slot / 2);
      const angle = (source?.angle ?? input.aim) + (source?.swing ?? 0);
      // All three arms originate around the shoulder. Bent elbows create the
      // upper/lower rear fan and the forward working pair at the waist.
      const shoulderLocal = { x: side * (row === 1 ? 17 : 16), y: -5 + row * 3 };
      const armBob = Math.sin(pose.phase + row * 0.65 + (side === 1 ? Math.PI : 0)) * pose.stride;
      // Hand-local recoil and melee sweeps remain independent across all six slots.
      const grip = weaponGrip(slot, source?.angle ?? input.aim, source?.recoil ?? 0, source?.swing ?? 0);
      const hand = transform(grip.x + side * armBob * 0.7, grip.y + armBob * 1.7);
      const shoulder = transform(shoulderLocal.x, shoulderLocal.y);
      const elbowBase = row === 0 ? { x: side * 31, y: -29 }
        : row === 1 ? { x: side * 39, y: 19 }
        : { x: side * 21, y: 18 };
      const elbow = transform(elbowBase.x + (grip.x - config.x) * 0.35 + side * armBob * 0.35,
        elbowBase.y + (grip.y - config.y) * 0.35 + armBob * 0.8);
      return { slot, row, shoulder, elbow, hand, angle };
    });
    const drawArm = (arm: typeof arms[number]) => {
      this.limb(arm.shoulder, arm.elbow, arm.row === 2 ? 10.2 : 9.5, SHIRT);
      this.limb(arm.elbow, arm.hand, arm.row === 2 ? 7 : 6.7, SKIN);
      const cuff = { x: arm.elbow.x + (arm.hand.x - arm.elbow.x) * 0.2,
        y: arm.elbow.y + (arm.hand.y - arm.elbow.y) * 0.2 };
      this.limb(arm.elbow, cuff, 9, 0xdce8e9);
      g.fillStyle(SKIN).fillCircle(arm.hand.x, arm.hand.y, 4);
      g.lineStyle(1.4, INK).strokeCircle(arm.hand.x, arm.hand.y, 4);
    };
    arms.filter(arm => arm.row < 2).forEach(drawArm);

    // The three faces share a compact neck base above one broad office shirt.
    this.polygon([[-21, -6], [-10, -9], [10, -9], [21, -6], [24, 1], [21, 8], [14, 11], [13, 17], [8, 20], [-10, 19], [-14, 11], [-21, 8], [-24, 1]].map(([x, y]) => transform(x, y)), SHIRT, 2.3);
    this.polygon([[16, -4], [21, -3], [22, 3], [19, 7], [13, 12], [12, 17], [8, 18], [9, 9]].map(([x, y]) => transform(x, y)), 0xdbe6e9, 0);
    this.stroke([transform(-10, 14), transform(-3, 15), transform(6, 14)], 0xacbbc1, 1.1);
    this.polygon([[-10, 17], [11, 17], [10, 21], [-10, 21]].map(([x, y]) => transform(x, y)), 0x344054, 1.5);
    for (const side of [-1, 1]) {
      this.polygon([[side * 16, -15], [side * 26, -15], [side * 21, -8], [side * 7, -5]].map(([x, y]) => transform(x, y)), SKIN, 1.2);
      this.polygon([[side * 7, -8], [side * 21, -10], [side * 24, -6], [side * 13, -2]].map(([x, y]) => transform(x, y)), SHIRT, 1.3);
    }
    this.polygon([[-4, -12], [5, -12], [5, -5], [-4, -5]].map(([x, y]) => transform(x, y)), SKIN, 1.3);
    this.polygon([[-5, -9], [0, -5], [-4, 0], [-11, -8]].map(([x, y]) => transform(x, y)), SHIRT, 1.5);
    this.polygon([[5, -9], [0, -5], [5, 0], [11, -8]].map(([x, y]) => transform(x, y)), SHIRT, 1.5);
    const tieSway = Math.sin(pose.phase - 0.75) * pose.stride * 3.5 + Math.sin(pose.clock * 2.8 - 0.5) * 0.35
      - pose.lean * 15 + pose.swing * Math.cos(pose.swingAngle) * 3;
    this.polygon([[-2, -4], [2, -4], [3, -1], [0, 1], [-3, -1]].map(([x, y]) => transform(x, y)), 0xf28b5f, 1.2);
    this.polygon([[0, 0], [2, 1], [3 + tieSway, 15], [tieSway, 20], [-4 + tieSway, 15], [-1, 1]].map(([x, y]) => transform(x, y)), 0xed785b, 1.5);
    const badgeSway = -Math.sin(pose.phase - 1.1) * pose.stride * 1.8 - pose.lean * 5;
    this.stroke([transform(-8, 5), transform(-8 + badgeSway, 10)], 0x597b83, 1.4);
    this.polygon([[-11 + badgeSway, 9], [-5 + badgeSway, 9], [-5 + badgeSway, 17], [-11 + badgeSway, 17]].map(([x, y]) => transform(x, y)), 0xa2d5cf, 1);
    this.stroke([transform(-9 + badgeSway, 12), transform(-7 + badgeSway, 12)], INK, 1);
    this.stroke([transform(-9 + badgeSway, 14), transform(-6 + badgeSway, 14)], INK, 1);
    arms.filter(arm => arm.row === 2).forEach(drawArm);

    const chin = transform(0, -9);
    const weapon = transform(0, 3);
    const heads = [-1, 0, 1].map(side => {
      const anchor = transform(side * 22, side === 0 ? -9 : -11);
      return { x: input.x + anchor.x, y: input.y + anchor.y,
        tilt: pose.lean * 0.55, scale: side === 0 ? 0.96 : 0.84 };
    });
    return {
      headX: input.x + chin.x, headY: input.y + chin.y,
      headTilt: pose.lean * 0.55,
      headScaleX: 1 + (pose.scaleX - 1) * 0.38,
      headScaleY: 1 + (pose.scaleY - 1) * 0.38,
      weaponX: input.x + weapon.x, weaponY: input.y + weapon.y,
      shadowScale: 1 - Math.abs(Math.sin(pose.phase)) * pose.stride * 0.07,
      moving: pose.moving, directionX: pose.directionX,
      grips: arms.map(arm => ({ slot: arm.slot,
        x: input.x + arm.hand.x, y: input.y + arm.hand.y, angle: arm.angle, depth: 18 })),
      heads,
    };
  }

  private foot(side: number, pose: PlayerPose): Point & { side: number; lift: number } {
    const cycle = Math.sin(pose.phase + (side === 1 ? Math.PI : 0));
    const lift = Math.max(0, cycle) * pose.stride * 6;
    return { side, lift,
      x: side * 7 + cycle * pose.stride * (pose.directionX * 7 + side * 1.2),
      y: 27 + cycle * pose.stride * pose.directionY * 6 - lift };
  }

  private limb(from: Point, to: Point, width: number, color: number): void {
    const g = this.graphics;
    g.lineStyle(width + 2.6, INK).lineBetween(from.x, from.y, to.x, to.y);
    g.fillStyle(INK).fillCircle(from.x, from.y, width / 2 + 1.3).fillCircle(to.x, to.y, width / 2 + 1.3);
    g.lineStyle(width, color).lineBetween(from.x, from.y, to.x, to.y);
    g.fillStyle(color).fillCircle(from.x, from.y, width / 2).fillCircle(to.x, to.y, width / 2);
  }

  private polygon(points: Point[], color: number, line = 2): void {
    const g = this.graphics;
    g.fillStyle(color).beginPath().moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath().fillPath();
    if (line) g.lineStyle(line, INK).strokePath();
  }

  private stroke(points: Point[], color: number, width: number): void {
    const g = this.graphics;
    g.lineStyle(width, color).beginPath().moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
  }

  destroy(): void { this.graphics.destroy(); }
}
