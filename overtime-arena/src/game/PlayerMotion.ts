import type { WeaponId } from '../shared.ts';

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));

export interface PlayerMotionInput {
  x: number;
  y: number;
  dt: number;
  time: number;
  maxSpeed: number;
  aim: number;
  weaponAngle?: number;
  weaponRadius?: number;
  alpha: number;
  paused: boolean;
}

export interface PlayerPose {
  phase: number;
  clock: number;
  stride: number;
  directionX: number;
  directionY: number;
  lean: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  recoil: number;
  swing: number;
  swingAngle: number;
  hurt: number;
  moving: boolean;
}

/** Visual state only: the simulation's position is never interpolated or changed here. */
export class PlayerMotion {
  private previousX = 0;
  private previousY = 0;
  private initialized = false;
  private phase = 0;
  private clock = 0;
  private stride = 0;
  private directionX = 1;
  private directionY = 0;
  private velocityX = 0;
  private lean = 0;
  private brake = 0;
  private attackAge = 10;
  private attackAngle = 0;
  private attackWeapon: WeaponId = 'stapler';
  private attackStrength = 1;
  private hurtAge = 10;
  private hurtAngle = 0;
  private pose: PlayerPose = this.restPose();

  private restPose(): PlayerPose {
    return { phase: 0, clock: 0, stride: 0, directionX: 1, directionY: 0, lean: 0,
      offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, recoil: 0, swing: 0,
      swingAngle: 0, hurt: 0, moving: false };
  }

  reset(x: number, y: number): void {
    this.previousX = x; this.previousY = y; this.initialized = true;
    this.phase = this.clock = this.stride = this.velocityX = this.lean = this.brake = 0;
    this.directionX = 1; this.directionY = 0;
    this.attackAge = this.hurtAge = 10;
    this.attackStrength = 1;
    this.pose = this.restPose();
  }

  attack(weapon: WeaponId, angle: number, strength = 1): void {
    this.attackWeapon = weapon; this.attackAngle = angle; this.attackAge = 0;
    this.attackStrength = clamp(strength, 0, 1);
  }

  hurt(angle: number): void { this.hurtAngle = angle; this.hurtAge = 0; }

  update(input: PlayerMotionInput): PlayerPose {
    if (!this.initialized) this.reset(input.x, input.y);
    const dx = input.x - this.previousX;
    const dy = input.y - this.previousY;
    this.previousX = input.x; this.previousY = input.y;
    // Consume coordinates even while paused, so a reset/teleport cannot create a stride.
    if (input.paused || input.dt <= 0) return this.pose;
    const dt = Math.min(input.dt, 0.05);
    this.clock += dt; this.attackAge += dt; this.hurtAge += dt;
    const distance = Math.hypot(dx, dy);
    const speed = distance / dt;
    const maxSpeed = Math.max(1, input.maxSpeed);
    const amount = clamp(speed / maxSpeed, 0, 1);
    const moving = speed > 2;
    if (moving) {
      this.directionX = mix(this.directionX, dx / distance, 23, dt);
      this.directionY = mix(this.directionY, dy / distance, 23, dt);
      // A full left/right cycle covers 96 world units. Frame rate never sets cadence.
      this.phase = (this.phase + Math.min(distance, maxSpeed * dt * 1.5) * TAU / 96) % TAU;
    }
    this.stride = mix(this.stride, moving ? amount : 0, moving ? 18 : 15, dt);
    const vx = moving ? clamp(dx / dt / maxSpeed, -1, 1) : 0;
    // A brief opposing lean communicates braking and turns without moving the hitbox.
    this.brake = clamp(this.brake + (this.velocityX - vx) * 0.095, -0.13, 0.13);
    this.brake *= Math.exp(-11 * dt);
    this.velocityX = vx;
    this.lean = mix(this.lean, -this.directionX * this.stride * 0.13 + this.brake, 17, dt);

    const stamp = this.attackWeapon === 'stamp';
    const melee = this.attackWeapon === 'keyboard' || stamp;
    const heavyShot = this.attackWeapon === 'scatter' || this.attackWeapon === 'coffee';
    const recoil = !melee ? Math.exp(-this.attackAge * (heavyShot ? 15 : 22)) * this.attackStrength : 0;
    const swingProgress = clamp(this.attackAge / 0.3, 0, 1);
    const swing = melee && swingProgress < 1 ? Math.sin(Math.PI * swingProgress) * this.attackStrength : 0;
    const stampPress = stamp ? swing * Math.max(0, Math.sin(swingProgress * Math.PI - 0.4)) : 0;
    const swingAngle = input.weaponAngle ?? (this.attackAngle + (swingProgress * 1.65 - 0.85));
    const hurt = this.hurtAge < 0.42 ? Math.exp(-this.hurtAge * 10) : 0;
    // Compression first, then one restrained spring-back instead of a jittery shake.
    const squash = this.hurtAge < 0.42 ? Math.cos(this.hurtAge * 23) * hurt : 0;
    const footfall = Math.cos(this.phase * 2);
    const breathe = Math.sin(this.clock * 2.8) * (1 - this.stride);
    const recoilStrength = heavyShot ? 3.7 : this.attackWeapon === 'laser' ? 1 : this.attackWeapon === 'cable' ? 1.5 : 2.2;
    this.pose = {
      phase: this.phase, clock: this.clock, stride: this.stride,
      directionX: this.directionX, directionY: this.directionY,
      lean: this.lean + Math.cos(this.attackAngle) * recoil * 0.045 + Math.sin(swingAngle) * swing * 0.09,
      offsetX: -Math.cos(this.attackAngle) * recoil * recoilStrength + Math.cos(this.hurtAngle) * hurt * 3.4,
      offsetY: -Math.abs(Math.sin(this.phase)) * this.stride * 2.8 + breathe * 0.55
        - Math.sin(this.attackAngle) * recoil * recoilStrength + Math.sin(this.hurtAngle) * hurt * 2.2 + squash * 2.1 + stampPress * 2.6,
      scaleX: 1 - footfall * this.stride * 0.025 + squash * 0.13 + stampPress * 0.035,
      scaleY: 1 + footfall * this.stride * 0.035 - squash * 0.15 - stampPress * 0.045,
      recoil, swing, swingAngle, hurt, moving: this.stride > 0.07,
    };
    return this.pose;
  }
}
