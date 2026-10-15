import Phaser from 'phaser';
import type { WeaponId } from '../shared';

const MAX_PARTICLES = 540;
const MAX_LABELS = 28;
const CREAM = 0xfff6dd;
const ORANGE = 0xffc45f;
const INK = 0x292b40;

const enum Shape {
  Dot,
  Streak,
  Chip,
  Ring,
  Arc,
  Star,
}

interface Particle {
  active: boolean;
  shape: Shape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  duration: number;
  size: number;
  endSize: number;
  rotation: number;
  spin: number;
  drag: number;
  color: number;
  alpha: number;
  width: number;
}

interface Label {
  text: Phaser.GameObjects.Text;
  life: number;
  duration: number;
  x: number;
  y: number;
  vx: number;
  critical: boolean;
}

/** Bounded, world-space combat effects. All visual animation advances in update(). */
export class Feedback {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false, shape: Shape.Dot, x: 0, y: 0, vx: 0, vy: 0,
    life: 0, duration: 0, size: 0, endSize: 0, rotation: 0, spin: 0,
    drag: 0, color: CREAM, alpha: 1, width: 1,
  }));
  private readonly labels: Label[];
  private particleCursor = 0;
  private labelCursor = 0;
  private volume = 0.45;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly voices = new Set<AudioScheduledSourceNode>();
  private readonly soundTimes = new Map<string, number>();
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(30);
    this.labels = Array.from({ length: MAX_LABELS }, () => ({
      text: scene.add.text(0, 0, '', {
        fontFamily: '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fff6dd',
        stroke: '#292b40',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(35).setVisible(false),
      life: 0, duration: 0, x: 0, y: 0, vx: 0, critical: false,
    }));
  }

  setVolume(value: number): void {
    this.volume = Number.isFinite(value) ? Phaser.Math.Clamp(value, 0, 1) : 0;
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    // A zero volume is immediate, including already playing sounds.
    this.master.gain.setValueAtTime(this.volume * 0.55, now);
  }

  /** Call from a pointer, keyboard, or start-button gesture. */
  unlock(): void {
    if (this.destroyed || typeof window === 'undefined') return;
    if (!this.context && navigator.userActivation && !navigator.userActivation.isActive) return;
    try {
      if (!this.context) {
        const AudioContextType = window.AudioContext ??
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextType) return;
        const context = new AudioContextType({ latencyHint: 'interactive' });
        this.context = context;
        this.master = context.createGain();
        this.master.gain.value = this.volume * 0.55;
        this.compressor = context.createDynamicsCompressor();
        this.compressor.threshold.value = -15;
        this.compressor.knee.value = 8;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.12;
        this.master.connect(this.compressor);
        this.compressor.connect(context.destination);
        this.noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.25), context.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      // Feedback remains fully functional when audio is unavailable.
      this.releaseAudio();
    }
  }

  muzzle(x: number, y: number, angle: number, color: number, scale = 1): void {
    this.emit(Shape.Star, x, y, 0, 0, 0.075, 11 * scale, 2, ORANGE, angle, 2, 0, 1);
    this.emit(Shape.Streak, x + Math.cos(angle) * 8, y + Math.sin(angle) * 8,
      Math.cos(angle) * 110, Math.sin(angle) * 110, 0.075, 18 * scale, 2, color, angle, 0, 5, 0.9, 4 * scale);
    for (let i = 0; i < 3; i += 1) {
      const direction = angle + (Math.random() - 0.5) * 1.2;
      const speed = 80 + Math.random() * 120;
      this.emit(Shape.Streak, x, y, Math.cos(direction) * speed, Math.sin(direction) * speed,
        0.10 + Math.random() * 0.05, 6 * scale, 1, color, direction, 0, 7, 0.8, 1.5);
    }
  }

  hit(x: number, y: number, angle: number, color: number, critical = false): void {
    const force = critical ? 1.5 : 1;
    this.emit(Shape.Star, x, y, 0, 0, 0.13, 13 * force, 2, CREAM, angle, 3, 0, 1);
    this.emit(Shape.Ring, x, y, 0, 0, 0.16, 4, 23 * force, color, 0, 0, 0, 0.75, 2);
    for (let i = 0; i < (critical ? 11 : 6); i += 1) {
      const direction = angle + (Math.random() - 0.5) * 2.8;
      const speed = (85 + Math.random() * 180) * force;
      const white = i < 2;
      this.emit(i % 3 === 0 ? Shape.Chip : Shape.Streak, x, y,
        Math.cos(direction) * speed, Math.sin(direction) * speed,
        0.16 + Math.random() * 0.17, (white ? 8 : 5) * force, 0.3,
        i % 3 === 0 || white ? CREAM : color, direction, i % 3 === 0 ? (Math.random() - 0.5) * 12 : 0,
        5, white ? 1 : 0.9, 2.2);
    }
    if (this.canSound('hit', critical ? 0.065 : 0.045)) {
      this.tone(critical ? 680 : 410, 110, 0.045, critical ? 0.085 : 0.045, 'triangle');
      this.noise(0.027, critical ? 0.09 : 0.045, 'highpass', 1600);
    }
  }

  death(x: number, y: number, color: number, big = false): void {
    const scale = big ? 1.7 : 1;
    this.emit(Shape.Ring, x, y, 0, 0, 0.22, 23 * scale, 3, color, 0, 0, 0, 0.95, 2.5);
    this.emit(Shape.Ring, x, y, 0, 0, 0.3, 9, 36 * scale, CREAM, 0, 0, 0, 0.45, 1);
    this.emit(Shape.Star, x, y, 0, 0, 0.16, 19 * scale, 3, ORANGE, 0.2, 3, 0, 0.95);
    const count = big ? 21 : 13;
    for (let i = 0; i < count; i += 1) {
      const direction = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = (65 + Math.random() * 175) * scale;
      const shape = i % 6 === 0 ? Shape.Star : i % 4 === 0 ? Shape.Streak : Shape.Chip;
      this.emit(shape, x, y,
        Math.cos(direction) * speed, Math.sin(direction) * speed,
        0.25 + Math.random() * 0.28, (4 + Math.random() * 3) * scale, 0.5,
        shape === Shape.Star ? ORANGE : i % 3 === 0 ? color : CREAM,
        direction, (Math.random() - 0.5) * 14, 4, 0.95, 2.5);
    }
    if (this.canSound('death', big ? 0.10 : 0.065)) {
      this.tone(big ? 125 : 240, big ? 35 : 78, big ? 0.17 : 0.095, big ? 0.2 : 0.09, 'sine');
      this.tone(big ? 520 : 720, 220, 0.052, 0.045, 'triangle');
      this.noise(big ? 0.105 : 0.05, big ? 0.17 : 0.07, 'lowpass', big ? 1500 : 2200);
    }
  }

  slash(x: number, y: number, angle: number, range: number): void {
    this.emit(Shape.Arc, x, y, 0, 0, 0.13, range * 0.75, range, CREAM, angle - 0.1, 2.4, 0, 0.95, 7);
    this.emit(Shape.Arc, x, y, 0, 0, 0.21, range * 0.70, range * 0.98, ORANGE, angle - 0.28, 3.2, 0, 0.65, 2);
    this.emit(Shape.Arc, x, y, 0, 0, 0.17, range * 0.56, range * 0.82, ORANGE, angle - 0.05, 2.8, 0, 0.25, 12);
    for (let i = -1; i <= 1; i++) {
      const direction = angle + i * 0.58;
      this.emit(Shape.Star, x + Math.cos(direction) * range * 0.85, y + Math.sin(direction) * range * 0.85,
        Math.cos(direction) * 45, Math.sin(direction) * 45, 0.17, i === 0 ? 10 : 7, 1,
        i === 0 ? CREAM : ORANGE, direction, 5, 3, 0.9);
    }
    if (this.canSound('slash', 0.10)) {
      this.noise(0.095, 0.095, 'bandpass', 1600);
      this.tone(360, 120, 0.09, 0.055, 'triangle');
    }
  }

  ring(x: number, y: number, r: number, color: number): void {
    this.emit(Shape.Ring, x, y, 0, 0, 0.35, r * 0.25, r, color, 0, 0, 0, 0.85, 2.5);
    this.emit(Shape.Ring, x, y, 0, 0, 0.22, r * 0.15, r * 0.85, CREAM, 0, 0, 0, 0.4, 1);
  }

  /** A fixed-length beam centered between its endpoints, kept inside the particle budget. */
  beam(x1: number, y1: number, x2: number, y2: number, color: number, width = 3): void {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (!Number.isFinite(length) || length < 0.1) return;
    const x = (x1 + x2) * 0.5, y = (y1 + y2) * 0.5;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const thickness = Phaser.Math.Clamp(width, 1, 12);
    this.emit(Shape.Streak, x, y, 0, 0, 0.17, length, length, color, angle, 0, 0, 0.45, thickness * 3);
    this.emit(Shape.Streak, x, y, 0, 0, 0.11, length, length, color, angle, 0, 0, 1, thickness);
    this.emit(Shape.Streak, x, y, 0, 0, 0.07, length, length, CREAM, angle, 0, 0, 0.95, Math.max(1, thickness * 0.4));
    this.emit(Shape.Star, x2, y2, 0, 0, 0.14, 8 + thickness, 1, CREAM, angle, 2, 0, 0.9);
  }

  explosion(x: number, y: number, radius: number, color: number): void {
    if (!Number.isFinite(radius)) return;
    const r = Phaser.Math.Clamp(radius, 8, 320);
    this.emit(Shape.Ring, x, y, 0, 0, 0.24, r * 0.16, r, color, 0, 0, 0, 0.8, 7);
    this.emit(Shape.Ring, x, y, 0, 0, 0.35, r * 0.4, r, CREAM, 0, 0, 0, 0.5, 2);
    this.emit(Shape.Star, x, y, 0, 0, 0.16, r * 0.47, 6, CREAM, 0.2, -1.5, 0, 0.8);
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + (Math.random() - 0.5) * 0.22;
      const speed = r * (2.3 + Math.random() * 1.6);
      this.emit(i % 3 === 0 ? Shape.Chip : Shape.Dot, x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed, 0.24 + Math.random() * 0.16,
        3 + Math.random() * 5, 0.4, i % 4 === 0 ? CREAM : color, angle, 7, 6, 0.9);
    }
    if (this.canSound('explosion', 0.09)) {
      this.tone(110, 32, 0.16, 0.15, 'sine');
      this.noise(0.115, 0.12, 'lowpass', 1700);
    }
  }

  /** Event-time zigzag construction; update() only reuses the existing particle slots. */
  lightning(points: readonly { x: number; y: number }[], color: number): void {
    // Even malformed callers cannot exceed the shared pool with one chain.
    const count = Math.min(points.length, 13);
    for (let i = 1; i < count; i++) {
      const from = points[i - 1], to = points[i];
      const dx = to.x - from.x, dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance < 0.1) continue;
      const segments = Math.min(7, Math.max(2, Math.ceil(distance / 38)));
      const normalX = -dy / distance, normalY = dx / distance;
      const spread = Math.min(13, distance * 0.1);
      let previousX = from.x, previousY = from.y;
      for (let j = 1; j <= segments; j++) {
        const bend = j === segments ? 0 : (j % 2 === 0 ? -1 : 1) * spread * (0.5 + Math.random() * 0.5);
        const nextX = from.x + dx * j / segments + normalX * bend;
        const nextY = from.y + dy * j / segments + normalY * bend;
        const length = Math.hypot(nextX - previousX, nextY - previousY);
        const angle = Math.atan2(nextY - previousY, nextX - previousX);
        const x = (previousX + nextX) * 0.5, y = (previousY + nextY) * 0.5;
        this.emit(Shape.Streak, x, y, 0, 0, 0.16, length, length, color, angle, 0, 0, 0.85, 5);
        this.emit(Shape.Streak, x, y, 0, 0, 0.09, length, length, CREAM, angle, 0, 0, 1, 1.5);
        previousX = nextX; previousY = nextY;
      }
      this.emit(Shape.Star, to.x, to.y, 0, 0, 0.18, 9, 1, color, 0.2, 4, 0, 0.95);
    }
  }

  upgrade(x: number, y: number, color: number): void {
    this.emit(Shape.Ring, x, y, 0, 0, 0.55, 18, 72, color, 0, 0, 0, 0.9, 4);
    this.emit(Shape.Ring, x, y, 0, 0, 0.4, 8, 52, CREAM, 0, 0, 0, 0.85, 2);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      this.emit(i % 2 === 0 ? Shape.Star : Shape.Chip, x + Math.cos(angle) * 19, y + Math.sin(angle) * 19,
        Math.cos(angle) * 90, Math.sin(angle) * 65 - 35, 0.55 + Math.random() * 0.2,
        i % 2 === 0 ? 8 : 5, 1, i % 3 === 0 ? CREAM : color, angle, 3, 1.8, 1);
    }
    if (this.canSound('upgrade', 0.22)) {
      this.tone(520, 1040, 0.2, 0.09, 'triangle');
      this.tone(780, 1560, 0.28, 0.055, 'sine');
    }
  }

  damageText(x: number, y: number, amount: number, critical = false): void {
    const label = this.labels[this.labelCursor];
    this.labelCursor = (this.labelCursor + 1) % MAX_LABELS;
    label.duration = critical ? 0.68 : 0.46;
    label.life = label.duration;
    label.x = x + (Math.random() - 0.5) * 10;
    label.y = y - 21;
    label.vx = (Math.random() - 0.5) * 24;
    label.critical = critical;
    label.text.setText(`${Math.round(amount)}${critical ? '!' : ''}`)
      .setColor(critical ? '#ffdb70' : '#fffaf0')
      .setFontSize(critical ? 22 : 16)
      .setPosition(label.x, label.y)
      .setRotation(critical ? (Math.random() - 0.5) * 0.22 : 0)
      .setAlpha(1)
      .setScale(critical ? 1.35 : 1.12)
      .setVisible(true);
  }

  hurt(x: number, y: number): void {
    this.emit(Shape.Star, x, y - 5, 0, -20, 0.16, 20, 4, 0xffa1ab, 0.2, -3, 0, 0.85);
    this.emit(Shape.Ring, x, y, 0, 0, 0.24, 12, 39, 0xfa829b, 0, 0, 0, 0.85, 3);
    for (let i = 0; i < 9; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 110 + Math.random() * 100;
      this.emit(Shape.Streak, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.2, 9, 1, i < 2 ? CREAM : 0xfa829b, angle, 0, 3, 1, 2);
    }
    if (this.canSound('hurt', 0.16)) {
      this.tone(140, 38, 0.18, 0.18, 'triangle');
      this.noise(0.1, 0.13, 'lowpass', 850);
    }
  }

  shot(kind: WeaponId): void {
    if (!this.canSound('shot', 0.035)) return;
    if (kind === 'scatter') {
      this.tone(130, 38, 0.09, 0.17, 'triangle');
      this.noise(0.085, 0.15, 'lowpass', 2300);
    } else if (kind === 'keyboard') {
      this.tone(510, 190, 0.045, 0.05, 'square');
      this.noise(0.032, 0.07, 'bandpass', 1300);
    } else if (kind === 'laser') {
      this.tone(2200, 530, 0.095, 0.065, 'sine');
      this.tone(1320, 350, 0.065, 0.018, 'sawtooth');
    } else if (kind === 'coffee') {
      this.tone(270, 95, 0.095, 0.08, 'sine');
      this.noise(0.065, 0.045, 'bandpass', 680);
    } else if (kind === 'folder') {
      this.noise(0.11, 0.09, 'bandpass', 2400);
      this.tone(420, 180, 0.08, 0.028, 'triangle');
    } else if (kind === 'stamp') {
      this.tone(95, 29, 0.15, 0.19, 'sine');
      this.noise(0.07, 0.13, 'lowpass', 1150);
    } else if (kind === 'cable') {
      this.tone(1150, 260, 0.085, 0.04, 'sawtooth');
      this.noise(0.055, 0.065, 'highpass', 3600);
    } else {
      this.tone(1750, 680, 0.033, 0.05, 'triangle');
      this.noise(0.038, 0.065, 'highpass', 2100);
    }
  }

  pickup(): void {
    if (this.canSound('pickup', 0.075)) this.tone(750, 1150, 0.075, 0.035, 'sine');
  }

  update(dt: number): void {
    if (this.destroyed) return;
    const step = Math.min(Math.max(dt, 0), 0.05);
    this.graphics.clear();
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.life -= step;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      const damping = Math.exp(-particle.drag * step);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.rotation += particle.spin * step;
      this.draw(particle);
    }
    for (const label of this.labels) {
      if (label.life <= 0) continue;
      label.life -= step;
      if (label.life <= 0) {
        label.text.setVisible(false);
        continue;
      }
      const progress = 1 - label.life / label.duration;
      label.x += label.vx * step;
      label.y -= (label.critical ? 49 : 40) * step;
      label.text.setPosition(label.x, label.y)
        .setAlpha(1 - Math.pow(progress, 2.5))
        .setScale(1 + (label.critical ? 0.35 : 0.12) * Math.exp(-progress * 14));
    }
  }

  clear(): void {
    for (const particle of this.particles) particle.active = false;
    for (const label of this.labels) {
      label.life = 0;
      label.text.setVisible(false);
    }
    this.graphics.clear();
    this.stopVoices();
    this.soundTimes.clear();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.clear();
    this.destroyed = true;
    this.graphics.destroy();
    for (const label of this.labels) label.text.destroy();
    this.releaseAudio();
  }

  private emit(shape: Shape, x: number, y: number, vx: number, vy: number,
    duration: number, size: number, endSize: number, color: number, rotation = 0,
    spin = 0, drag = 0, alpha = 1, width = 1): void {
    if (this.destroyed) return;
    // Overwrite the oldest slot on saturation: no allocations and a strict draw budget.
    const particle = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    particle.active = true;
    particle.shape = shape;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.duration = duration;
    particle.life = duration;
    particle.size = size;
    particle.endSize = endSize;
    particle.color = color;
    particle.rotation = rotation;
    particle.spin = spin;
    particle.drag = drag;
    particle.alpha = alpha;
    particle.width = width;
  }

  private draw(particle: Particle): void {
    const progress = 1 - particle.life / particle.duration;
    const ease = 1 - (1 - progress) * (1 - progress);
    const size = particle.size + (particle.endSize - particle.size) * ease;
    const alpha = particle.alpha * (1 - progress * progress);
    const graphics = this.graphics;
    const cos = Math.cos(particle.rotation);
    const sin = Math.sin(particle.rotation);
    const { x, y } = particle;
    switch (particle.shape) {
      case Shape.Dot:
        graphics.fillStyle(particle.color, alpha).fillCircle(x, y, Math.max(0.2, size));
        graphics.lineStyle(1, INK, alpha * 0.7).strokeCircle(x, y, Math.max(0.2, size));
        break;
      case Shape.Streak: {
        const width = Math.max(0.5, particle.width * (1 - progress * 0.6));
        graphics.lineStyle(width + 1.5, INK, alpha * 0.55);
        graphics.lineBetween(x - cos * size * 0.5, y - sin * size * 0.5,
          x + cos * size * 0.5, y + sin * size * 0.5);
        graphics.lineStyle(width, particle.color, alpha);
        graphics.lineBetween(x - cos * size * 0.5, y - sin * size * 0.5,
          x + cos * size * 0.5, y + sin * size * 0.5);
        break;
      }
      case Shape.Chip: {
        // Small rotating sheets of paperwork; drawing uses only the bounded pool.
        const length = size;
        const width = size * 0.58;
        graphics.fillStyle(particle.color, alpha).lineStyle(1, INK, alpha * 0.8).beginPath();
        graphics.moveTo(x - cos * length + sin * width, y - sin * length - cos * width);
        graphics.lineTo(x + cos * length + sin * width, y + sin * length - cos * width);
        graphics.lineTo(x + cos * length - sin * width, y + sin * length + cos * width);
        graphics.lineTo(x - cos * length - sin * width, y - sin * length + cos * width);
        graphics.closePath().fillPath().strokePath();
        if (size > 2.5) {
          graphics.lineStyle(0.8, INK, alpha * 0.45).lineBetween(
            x - cos * length * 0.55, y - sin * length * 0.55,
            x + cos * length * 0.55, y + sin * length * 0.55);
        }
        break;
      }
      case Shape.Ring:
        graphics.lineStyle(Math.max(0.5, particle.width * (1 - progress * 0.5)), particle.color, alpha)
          .strokeCircle(x, y, Math.max(0.1, size));
        break;
      case Shape.Arc:
        graphics.lineStyle(Math.max(0.5, particle.width * (1 - progress * 0.8)) + 2, INK, alpha * 0.65)
          .beginPath().arc(x, y, size, particle.rotation - 0.82, particle.rotation + 0.82, false)
          .strokePath();
        graphics.lineStyle(Math.max(0.5, particle.width * (1 - progress * 0.8)), particle.color, alpha)
          .beginPath().arc(x, y, size, particle.rotation - 0.82, particle.rotation + 0.82, false)
          .strokePath();
        break;
      case Shape.Star:
        graphics.fillStyle(particle.color, alpha).lineStyle(Math.max(0.7, size * 0.10), INK, alpha * 0.9).beginPath();
        for (let point = 0; point < 10; point++) {
          const angle = particle.rotation - Math.PI / 2 + point * Math.PI / 5;
          const radius = size * (point % 2 === 0 ? 1 : 0.43);
          const sx = x + Math.cos(angle) * radius, sy = y + Math.sin(angle) * radius;
          if (point === 0) graphics.moveTo(sx, sy); else graphics.lineTo(sx, sy);
        }
        graphics.closePath().fillPath().strokePath();
        break;
    }
  }

  private canSound(name: string, interval: number): boolean {
    const context = this.context;
    if (!context || context.state !== 'running' || this.volume <= 0 || this.voices.size >= 26) return false;
    const now = context.currentTime;
    if (now - (this.soundTimes.get(name) ?? -Infinity) < interval) return false;
    this.soundTimes.set(name, now);
    return true;
  }

  private tone(startHz: number, endHz: number, duration: number, amplitude: number, type: OscillatorType): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.voices.size >= 28) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startHz, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(amplitude, now + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    this.trackVoice(oscillator, [envelope]);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.005);
  }

  private noise(duration: number, amplitude: number, type: BiquadFilterType, frequency: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.noiseBuffer || this.voices.size >= 28) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(amplitude, now + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    this.trackVoice(source, [filter, envelope]);
    source.start(now, Math.random() * 0.04);
    source.stop(now + duration + 0.005);
  }

  private trackVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]): void {
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      for (const node of nodes) node.disconnect();
      this.voices.delete(source);
      source.onended = null;
    };
  }

  private stopVoices(): void {
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* Already ended. */ }
      voice.disconnect();
      // Run the same cleanup synchronously, even if the context is suspended.
      voice.onended?.(new Event('ended'));
    }
    this.voices.clear();
  }

  private releaseAudio(): void {
    this.stopVoices();
    this.master?.disconnect();
    this.compressor?.disconnect();
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
  }
}
