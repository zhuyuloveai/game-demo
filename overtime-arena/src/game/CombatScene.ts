import Phaser from 'phaser';
import { DEFAULT_SETTINGS, publishSettings, publishStats, type LabCommand, type Settings, type Stats, type RunAttributes } from '../shared';
import { DEFAULT_AVATAR_URL, DEFAULT_AVATAR_PROFILE_URL } from '../avatar';
import { angleDifference, clamp, normaliseInput, segmentCircle, SpatialHash } from './math';
import { createArena, createTextures } from './textures';
import { Feedback } from './Feedback';
import { capPointerMovement, PointerSteering, type PointerKind, type PointerSample } from './PointerSteering';
import { PointerLockController, type PointerLockState } from './PointerLock';
import { PhotoHead } from './PhotoHead';
import { hasNearbyThreat } from './AvatarThreat';
import { PlayerBody } from './PlayerBody';
import { WEAPON_SLOTS, createWeaponRack, advanceWeapon, triggerWeapon, weaponSwing, pickWeaponTarget, grantWeaponXp, type WeaponSlotState } from './WeaponRig';
import { DEFAULT_LOADOUT, normalizeLoadout, createStartingLoadout, weaponStats, nextWeaponXp, WEAPON_LEVELS } from './WeaponModel';
import { attackRateMultiplier, normalizePlayerAttributes, resolveDamage, rollCritical, composeRunAttributes, scaledWeaponDamage, incomingDamage, regenPerSecond, playerMoveSpeed, pickupRadius } from './PlayerModel';
import { RunProgress } from './RunModel';
import { beamTargets, chainTargets, blastTargets } from './WeaponAttacks';
import { ENEMY_DEFS, enemyStats, pressureAt, chooseEnemyKind, waveEnemyStats, wavePressure, chooseWaveEnemyKind, ENEMY_VOLLEY, createEnemyBrain, stepEnemyBrain, enemyDamageMultiplier, type EnemyKind, type EnemyBrain } from './EnemyModel';

import { WORLD, VIEWPORT, WORLD_CENTER, WORLD_BOUNDS, cameraScrollFor, enemySpawnPoint } from './WorldModel';
import { isBossKind, bossForWave, createBossBrain, stepBossBrain, bossAttackInfo } from './BossModel';

const STEP = 1 / 120;
const BOUNDS = WORLD_BOUNDS;
const MAX_ENEMY_RADIUS = Math.max(...Object.values(ENEMY_DEFS).map(def => def.radius));
interface Enemy {
  active: boolean; id: number; x: number; y: number; px: number; py: number;
  vx: number; vy: number; hp: number; maxHp: number; radius: number; speed: number;
  kind: EnemyKind; spawn: number; flash: number; phase: number;
  damage: number; brain: EnemyBrain;
  sprite: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image;
}
interface Bullet {
  active: boolean; x: number; y: number; px: number; py: number; vx: number; vy: number;
  life: number; damage: number; knockback: number; pierce: number; hit: Set<number>;
  critical: boolean; attributes: RunAttributes; firstSweep: boolean; sprite: Phaser.GameObjects.Image;
}
interface Pickup { active: boolean; x: number; y: number; vx: number; vy: number; life: number; value: number; sprite: Phaser.GameObjects.Image; }
interface EnemyShot {
  active: boolean; x: number; y: number; px: number; py: number;
  vx: number; vy: number; life: number; damage: number; sprite: Phaser.GameObjects.Image;
}
interface SpecialShot {
  active: boolean; kind: 'coffee' | 'folder'; slot: number;
  x: number; y: number; px: number; py: number; startX: number; startY: number;
  endX: number; endY: number; vx: number; vy: number; age: number; duration: number;
  life: number; returning: boolean; pierce: number; critical: boolean;
  stats: ReturnType<typeof weaponStats>; attributes: RunAttributes; hit: Set<number>; sprite: Phaser.GameObjects.Image;
}

export class CombatScene extends Phaser.Scene {
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private player = { x: WORLD_CENTER.x, y: WORLD_CENTER.y, px: WORLD_CENTER.x, py: WORLD_CENTER.y, hp: 100, angle: -Math.PI / 2, invulnerable: 0, dx: 0, dy: -1 };
  private body!: PlayerBody;
  private photoHead!: PhotoHead;
  private threatNearby = false;
  private shadow!: Phaser.GameObjects.Image;
  private guns: Phaser.GameObjects.Image[] = [];
  private loadout = normalizeLoadout(DEFAULT_LOADOUT);
  private rack = createWeaponRack(createStartingLoadout(this.loadout));
  private gripOffsets: { x: number; y: number }[] = WEAPON_SLOTS.map(({ x, y }) => ({ x, y }));
  private claimedTargets = new Set<number>();
  private markings!: Phaser.GameObjects.Graphics;
  private feedback!: Feedback;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private enemyShots: EnemyShot[] = [];
  private specialShots: SpecialShot[] = [];
  private pickups: Pickup[] = [];
  private grid = new SpatialHash<Enemy>(80);
  private nearby: Enemy[] = [];
  private running = false;
  private paused = false;
  private ready = false;
  private elapsed = 0;
  private run: RunProgress | null = null;
  private waveElapsed = 0;
  private lifeStealCooldown = 0;
  private bossVictoryDelay = 0;
  private kills = 0;
  private combo = 0;
  private bestCombo = 0;
  private comboTime = 0;
  private deaths = 0;
  private accumulator = 0;
  private spawnTimer = 0;
  private uiTimer = 0;
  private inputKeys = new Set<string>();
  private touch = { x: 0, y: 0 };
  private pointer = new PointerSteering();
  private pointerSampleTime: number | null = null;
  private pointerLock!: PointerLockController;
  private pointerLockMessage = '';
  private unsupportedAcknowledged = false;
  private lastInputKind: PointerKind | 'keyboard' | 'gamepad' = 'mouse';
  private enemySerial = 0;
  private lastFrame = 0;
  private frames: number[] = [];
  private frameCursor = 0;
  private p95 = 0;
  private gamepadMove = { x: 0, y: 0 };
  private shakeCooldown = 0;

  constructor() { super('Combat'); }
  preload(): void {
    this.load.image('office-background', '/assets/office-background-v1.png');
    this.load.image('default-avatar', DEFAULT_AVATAR_URL);
    this.load.image('default-avatar-profile', DEFAULT_AVATAR_PROFILE_URL);
  }
  create(): void {
    createTextures(this);
    createArena(this);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.markings = this.add.graphics().setDepth(4);
    this.shadow = this.add.image(this.player.x, this.player.y + 24, 'shadow').setDepth(9);
    this.body = new PlayerBody(this);
    this.body.reset(this.player.x, this.player.y);
    this.photoHead = new PhotoHead(this);
    this.guns = WEAPON_SLOTS.map(config => this.add.image(this.player.x + config.x, this.player.y + config.y, `gun-${config.weapon}`)
      .setDepth(18).setOrigin(0.3, 0.5).setScale(0.76));
    this.feedback = new Feedback(this);
    this.feedback.setVolume(this.settings.volume);
    this.bindEvents();
    this.ready = true;
    this.seedDummies();
    this.draw(1);
    if (import.meta.env.DEV) {
      (window as unknown as { __combatLab: unknown }).__combatLab = {
        snapshot: () => ({ ...this.stats(), player: { ...this.player }, settings: { ...this.settings },
          weapons: this.rack.map(slot => ({ ...slot })),
          enemyKinds: Object.fromEntries(Object.keys(ENEMY_DEFS).map(kind => [kind, this.enemies.filter(e => e.active && e.kind === kind).length])),
          hostileProjectiles: this.enemyShots.filter(b => b.active).length,
          specialProjectiles: this.specialShots.filter(b => b.active).length,
          bullets: this.bullets.filter(b => b.active).length, pool: { enemies: this.enemies.length, bullets: this.bullets.length, pickups: this.pickups.length } }),
        spawn: (count = 80) => { for (let i = 0; i < Math.min(240, count); i++) this.spawnEnemy(); },
      };
    }
    this.emit();
  }
  private bindEvents(): void {
    const canvas = this.game.canvas;
    this.pointerLock = new PointerLockController({
      isSupported: () => typeof canvas.requestPointerLock === 'function',
      isLocked: () => document.pointerLockElement === canvas,
      request: () => this.requestCanvasLock(),
      exit: () => document.exitPointerLock(),
    }, state => this.onPointerLockState(state), () => { if (this.running) this.setPaused(true); });
    const lockChange = () => this.pointerLock.changed();
    const lockError = () => this.pointerLock.failed();
    const recordPointer = (e: PointerEvent) => { this.lastInputKind = e.pointerType === 'touch' || e.pointerType === 'pen' ? e.pointerType : 'mouse'; };
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('pointerlockerror', lockError);
    window.addEventListener('pointerdown', recordPointer, true);
    const onCommand = (event: Event) => this.handleCommand((event as CustomEvent<LabCommand>).detail);
    const typing = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
      const supported = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'];
      if (!supported.includes(e.code)) return;
      if (e.code !== 'Escape') e.preventDefault();
      this.inputKeys.add(e.code);
      if (e.repeat) return;
      this.lastInputKind = 'keyboard';
      this.feedback.unlock();
      // Escape may arrive before or after the browser's unlock event. It only
      // pauses, so that event ordering can never resume or immediately relock.
      if (e.code === 'Escape') { if (this.running) this.setPaused(true); }
    };
    const up = (e: KeyboardEvent) => this.inputKeys.delete(e.code);
    const loseFocus = () => { this.resetInput(); if (this.running) this.setPaused(true); };
    const visibility = () => { if (document.hidden) loseFocus(); };
    window.addEventListener('lab:command', onCommand);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', loseFocus);
    document.addEventListener('visibilitychange', visibility);
    const kind = (e: PointerEvent): PointerKind => e.pointerType === 'touch' || e.pointerType === 'pen' ? e.pointerType : 'mouse';
    // Store client coordinates so page scrolling or resizing never becomes movement.
    const sample = (e: PointerEvent): PointerSample => ({ id: e.pointerId, kind: kind(e), x: e.clientX, y: e.clientY });
    const pointerMove = (e: PointerEvent) => {
      if (!this.running || this.paused) return;
      // Mouse Lock guarantees mousemove. Ignore parallel pointermove events
      // to avoid counting the same physical motion twice.
      if (kind(e) === 'mouse' && this.pointerLock.state !== 'unsupported') return;
      if (!this.pointer.move(sample(e))) return;
      this.applyDirectPointer(e.timeStamp);
    };
    const pointerDown = (e: PointerEvent) => {
      if (!this.running || this.paused || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (kind(e) === 'mouse' && this.pointerLock.state !== 'unsupported') {
        if (document.pointerLockElement !== canvas) this.resumeControls();
        return;
      }
      if (kind(e) !== 'mouse' && document.pointerLockElement === canvas) {
        this.pointerLock.release(); this.resetInput();
      }
      if (!this.pointer.down(sample(e))) return;
      this.applyDirectPointer(e.timeStamp);
      e.preventDefault();
      this.feedback.unlock();
      if (e.pointerType !== 'mouse') {
        try { canvas.setPointerCapture(e.pointerId); } catch { /* A canceled contact is reset by pointercancel. */ }
      }
      document.getElementById('game-host')?.focus({ preventScroll: true });
    };
    const releasePointer = (e: PointerEvent) => { this.pointer.up(e.pointerId); this.syncPointerCursor(); };
    const cancelPointer = (e: PointerEvent) => { this.pointer.cancel(e.pointerId); this.syncPointerCursor(); };
    const leavePointer = (e: PointerEvent) => { if (document.pointerLockElement !== canvas) this.pointer.leave(kind(e)); };
    const lockedMove = (e: MouseEvent) => {
      if (!this.running || this.paused || document.pointerLockElement !== canvas) return;
      if (this.pointer.moveRelative(e.movementX, e.movementY)) this.applyDirectPointer(e.timeStamp);
    };
    const lockedWheel = (e: WheelEvent) => { if (document.pointerLockElement === canvas) e.preventDefault(); };
    document.addEventListener('mousemove', lockedMove);
    canvas.addEventListener('wheel', lockedWheel, { passive: false });
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointerleave', leavePointer);
    canvas.addEventListener('lostpointercapture', cancelPointer);
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', cancelPointer);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
      this.pointerLock.dispose();
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('pointerlockerror', lockError);
      window.removeEventListener('pointerdown', recordPointer, true);
      document.removeEventListener('mousemove', lockedMove);
      canvas.removeEventListener('wheel', lockedWheel);
      window.removeEventListener('lab:command', onCommand);
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', loseFocus); document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerleave', leavePointer); canvas.removeEventListener('lostpointercapture', cancelPointer);
      window.removeEventListener('pointerup', releasePointer); window.removeEventListener('pointercancel', cancelPointer);
      this.feedback.destroy();
      this.photoHead.destroy();
      this.body.destroy();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }
  private requestCanvasLock(): Promise<void> {
    const canvas = this.game.canvas;
    // Normalize legacy void-returning implementations too. These one-request
    // listeners outlive a scene shutdown so a late grant can still be released.
    return new Promise((resolve, reject) => {
      const cleanup = () => { document.removeEventListener('pointerlockchange', changed, true); document.removeEventListener('pointerlockerror', failed); };
      const changed = () => { if (document.pointerLockElement === canvas) { cleanup(); resolve(); } };
      const failed = (reason?: unknown) => { cleanup(); reject(reason); };
      // Observe grants before the main listener can release a canceled request.
      document.addEventListener('pointerlockchange', changed, true);
      document.addEventListener('pointerlockerror', failed);
      try {
        const result = canvas.requestPointerLock() as Promise<void> | void;
        result?.then(() => { cleanup(); resolve(); }, failed);
      } catch (error) { failed(error); }
    });
  }
  private onPointerLockState(state: PointerLockState): void {
    if (state === 'locked') {
      if (!this.running || (this.run && this.run.phase !== 'combat')) { this.pointerLock.release(); return; }
      this.paused = false; this.resetInput();
      this.pointer.moveRelative(0, 0);
      this.pointerSampleTime = performance.now();
      document.getElementById('game-host')?.focus({ preventScroll: true });
    } else if (state === 'pending' || state === 'error') {
      this.paused = true; this.resetInput();
    }
    this.pointerLockMessage = state === 'pending' ? '正在锁定鼠标…'
      : state === 'error' ? '浏览器未能锁定鼠标，游戏已暂停。请点击“继续战斗”重试；若仍失败，请在支持鼠标锁定的浏览器中打开游戏。'
      : state === 'unsupported' ? '当前浏览器不支持鼠标锁定，可用 WASD / 方向键或触屏继续。' : '';
    if (this.ready) this.emit();
  }
  private resumeControls(): void {
    if (!this.running || (this.run && this.run.phase !== 'combat')) return;
    this.resetInput(); this.lastFrame = 0;
    this.paused = false;
    const wantsMouse = this.lastInputKind === 'mouse'
      || (this.lastInputKind === 'keyboard' && window.matchMedia('(any-pointer: fine)').matches);
    if (wantsMouse) {
      if (this.pointerLock.state === 'unsupported') {
        this.pointerLockMessage = '当前浏览器不支持鼠标锁定，可用 WASD / 方向键或触屏继续。';
        if (!this.unsupportedAcknowledged) { this.unsupportedAcknowledged = true; this.paused = true; }
      } else if (this.pointerLock.state === 'locked') {
        this.onPointerLockState('locked');
      } else {
        this.paused = true;
        this.pointerLock.request();
      }
    } else if (this.pointerLock.state === 'pending' || this.pointerLock.state === 'locked') {
      this.pointerLock.release();
    }
    this.emit();
  }
  private handleCommand(cmd: LabCommand): void {
    this.feedback.unlock();
    switch (cmd.type) {
      case 'avatar': this.photoHead.setPhoto(cmd.dataUrl); break;
      case 'avatar-expression':
        if (['neutral', 'angry', 'furious', 'panic', 'smug'].includes(cmd.expression)) this.photoHead.trigger(cmd.expression, 1600, true);
        break;
      case 'start': if (!this.running) this.start(); else this.setPaused(false); break;
      case 'restart': this.start(); break;
      case 'pause': if (this.running) this.setPaused(!this.paused); break;
      case 'move': this.touch = normaliseInput(cmd.x, cmd.y); break;
      case 'burst': if (this.running && !this.paused && this.settings.mode !== 'dummy') { for (let i = 0; i < 48; i++) this.spawnEnemy(); this.emit(); } break;
      case 'loadout': {
        if (this.activeRun() || (this.running && !this.paused)) break;
        this.loadout = normalizeLoadout(cmd.weapons);
        this.rack = createWeaponRack(this.settings.mode === 'dummy' ? this.loadout : createStartingLoadout(this.loadout));
        for (const slot of this.rack) this.guns[slot.slot].setTexture(`gun-${slot.weapon}`).setVisible(slot.equipped);
        for (const b of this.bullets) { b.active = false; b.sprite.setVisible(false); }
        this.clearSpecialShots(); this.claimedTargets.clear();
        this.emit();
        break;
      }
      case 'run-combine':
      case 'run-sell': {
        if (!this.run) break;
        const changed = cmd.type === 'run-combine' ? this.run.combine(cmd.slot, cmd.otherSlot) : this.run.sell(cmd.slot);
        if (changed) this.syncRunEquipment();
        this.emit();
        break;
      }
      case 'run-next': this.startNextWave(); break;
      case 'run-upgrade':
      case 'run-boss-reward':
      case 'run-buy': {
        if (!this.run) break;
        const maxHp = this.combatAttributes().maxHp;
        const changed = cmd.type === 'run-upgrade' ? this.run.chooseUpgrade(cmd.id) : cmd.type === 'run-boss-reward' ? this.run.chooseBossReward(cmd.id) : this.run.buy(cmd.id, cmd.slot);
        if (changed) {
          const nextMaxHp = this.combatAttributes().maxHp;
          this.player.hp = Math.min(nextMaxHp, this.player.hp + Math.max(0, nextMaxHp - maxHp));
          this.syncRunEquipment();
          if (this.run.phase === 'won') { this.running = false; this.paused = true; }
        }
        this.emit();
        break;
      }
      case 'run-lock': this.run?.toggleLock(cmd.id); this.emit(); break;
      case 'run-reroll-shop': this.run?.rerollShop(); this.emit(); break;
      case 'run-reroll-upgrades': this.run?.rerollUpgrades(); this.emit(); break;
      case 'settings': {
        const oldMode = this.settings.mode;
        const nextSettings = { ...this.settings, ...cmd.settings };
        // A run owns its starting build. Tuning movement/feedback remains available.
        if (this.activeRun()) {
          for (const key of ['attackPower', 'attackSpeed', 'critChance', 'mode', 'practice'] as const) {
            Object.assign(nextSettings, { [key]: this.settings[key] });
          }
        }
        this.settings = { ...nextSettings, ...normalizePlayerAttributes(nextSettings) };
        this.settings.speed = clamp(this.settings.speed, 160, 440);
        this.settings.pointerSensitivity = clamp(this.settings.pointerSensitivity, 0.5, 2);
        this.settings.knockback = clamp(this.settings.knockback, 0, 2.5);
        this.settings.shake = clamp(this.settings.shake, 0, 1);
        this.settings.volume = clamp(this.settings.volume, 0, 1);
        this.feedback.setVolume(this.settings.volume);
        if (this.settings.mode !== oldMode) {
          // Switching from the sandbox returns to setup. Starting then creates
          // the correct run model instead of an endless, unrewarded combat.
          this.run = null; this.running = false; this.paused = false;
          this.clearBattle(); this.feedback.clear();
          this.elapsed = 0; this.waveElapsed = 0; this.kills = 0; this.deaths = 0;
          this.combo = 0; this.bestCombo = 0; this.comboTime = 0;
          this.player.hp = this.combatAttributes().maxHp;
          this.rack = createWeaponRack(this.settings.mode === 'dummy' ? this.loadout : createStartingLoadout(this.loadout));
          for (const slot of this.rack) this.guns[slot.slot].setTexture(`gun-${slot.weapon}`).setVisible(slot.equipped);
          this.resetInput(); this.pointerLock.release(); this.seedDummies();
          this.emit();
        }
        publishSettings({ ...this.settings });
        this.syncPointerCursor();
        break;
      }
    }
  }
  private resetInput(): void { this.inputKeys.clear(); this.touch = { x: 0, y: 0 }; this.gamepadMove = { x: 0, y: 0 }; this.pointer.reset(); this.pointerSampleTime = null; this.accumulator = 0; this.syncPointerCursor(); }
  private syncPointerCursor(): void {
    // Pointer Lock itself owns cursor visibility, including failure / Escape.
    this.game.canvas.classList.remove('direct-pointer');
  }
  private applyDirectPointer(timestamp: number): void {
    const delta = this.pointer.consumeDelta();
    const seconds = this.pointerSampleTime === null ? 0 : (timestamp - this.pointerSampleTime) / 1000;
    this.pointerSampleTime = timestamp;
    const rect = this.game.canvas.getBoundingClientRect();
    const scaleX = VIEWPORT.width / Math.max(1, rect.width), scaleY = VIEWPORT.height / Math.max(1, rect.height);
    const directional = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(key => this.inputKeys.has(key))
      || Math.hypot(this.gamepadMove.x, this.gamepadMove.y, this.touch.x, this.touch.y) > 0.01;
    // Consume input even while another control owns movement. Nothing is queued
    // to pull the character back after keyboard use or reaching a wall.
    if (directional) this.pointer.stopSteering();
    if (this.running && !this.paused && !directional && !this.run?.bossDefeated) {
      const p = this.player;
      const oldX = p.x, oldY = p.y;
      const movement = capPointerMovement(delta.x * scaleX * this.settings.pointerSensitivity,
        delta.y * scaleY * this.settings.pointerSensitivity, this.moveSpeed(), seconds);
      const x = clamp(p.x + movement.x, BOUNDS.left + 10, BOUNDS.right - 10);
      const y = clamp(p.y + movement.y, BOUNDS.top + 10, BOUNDS.bottom - 10);
      const distance = Math.hypot(x - p.x, y - p.y);
      if (distance > 0) {
        p.dx = (x - p.x) / distance; p.dy = (y - p.y) / distance;
      }
      // Apply the allowed step on input arrival; excess motion is discarded.
      // There is no destination or backlog for the player to chase afterward.
      p.x = x; p.y = y; p.px = x; p.py = y;
      if (distance > 0 && p.invulnerable <= 0) {
        // Sweep each allowed step so contact damage also covers movement
        // between input events, using the same invulnerability window.
        const contact = this.enemies.find(e => e.active && e.spawn <= 0 && e.kind !== 'dummy'
          && segmentCircle(oldX, oldY, x, y, e.x, e.y, e.radius + 15));
        if (contact) this.hurt(contact);
        for (const shot of this.enemyShots) {
          if (shot.active && segmentCircle(oldX, oldY, x, y, shot.x, shot.y, 21)) {
            shot.active = false; shot.sprite.setVisible(false);
            this.takeDamage(shot.damage, Math.atan2(shot.vy, shot.vx));
          }
        }
      }
    }
    this.syncPointerCursor();
  }
  private setPaused(value: boolean): void {
    if (!value) { this.resumeControls(); return; }
    this.paused = true; this.resetInput(); this.lastFrame = 0;
    this.pointerLock.release(); this.emit();
  }
  private activeRun(): boolean {
    return !!this.run && this.run.phase !== 'won' && this.run.phase !== 'lost';
  }
  private combatAttributes(): RunAttributes { return this.run?.getAttributes() ?? composeRunAttributes(this.settings); }
  private moveSpeed(): number { return playerMoveSpeed(this.settings.speed, this.combatAttributes().speedBonus); }
  private pressureTime(): number { return this.run ? (this.run.wave - 1) * 15 : this.elapsed; }
  private clearBattle(): void {
    for (const e of this.enemies) this.deactivateEnemy(e);
    for (const b of this.bullets) { b.active = false; b.sprite.setVisible(false); }
    this.clearEnemyShots(); this.clearSpecialShots();
    for (const p of this.pickups) { p.active = false; p.sprite.setVisible(false); }
    this.claimedTargets.clear();
  }
  private syncRunEquipment(): void {
    if (!this.run) return;
    const next = createWeaponRack(this.run.getLoadout());
    for (const slot of next) {
      const current = this.rack[slot.slot];
      if (current.weapon === slot.weapon && current.level === slot.level && current.equipped === slot.equipped) continue;
      this.rack[slot.slot] = slot;
      this.guns[slot.slot].setTexture(`gun-${slot.weapon}`).setVisible(slot.equipped);
    }
  }
  private finishWave(): void {
    if (!this.run || this.run.phase !== 'combat' || (bossForWave(this.run.wave) && !this.run.bossDefeated)) return;
    // Sweep up everything left on the floor before the model closes rewards.
    for (const pickup of this.pickups) if (pickup.active) this.run.collect(pickup.value);
    if (!this.run.finishWave()) return;
    this.clearBattle(); this.feedback.clear();
    this.paused = true;
    if (this.run.snapshot().phase === 'won') this.running = false;
    this.resetInput(); this.pointerLock.release(); this.emit();
  }
  private startNextWave(): void {
    if (!this.run?.nextWave()) return;
    this.clearBattle(); this.feedback.clear(); this.photoHead.reset();
    this.waveElapsed = 0; this.lifeStealCooldown = 0; this.bossVictoryDelay = 0; this.spawnTimer = 0;
    this.combo = 0; this.comboTime = 0; this.threatNearby = false;
    Object.assign(this.player, { x: WORLD_CENTER.x, y: WORLD_CENTER.y, px: WORLD_CENTER.x, py: WORLD_CENTER.y, hp: this.combatAttributes().maxHp, invulnerable: 0.8 });
    this.body.reset(this.player.x, this.player.y);
    this.rack = createWeaponRack(this.run.getLoadout());
    for (const slot of this.rack) this.guns[slot.slot].setTexture(`gun-${slot.weapon}`).setVisible(slot.equipped);
    this.running = true; this.paused = false;
    this.spawnInitialEnemies(); this.resumeControls();
  }
  private start(): void {
    this.run = this.settings.mode === 'dummy' ? null : new RunProgress(this.settings, this.loadout);
    this.waveElapsed = 0; this.lifeStealCooldown = 0; this.bossVictoryDelay = 0;
    this.resetInput();
    for (const e of this.enemies) this.deactivateEnemy(e);
    for (const b of this.bullets) { b.active = false; b.sprite.setVisible(false); }
    this.clearEnemyShots();
    this.clearSpecialShots();
    for (const p of this.pickups) { p.active = false; p.sprite.setVisible(false); }
    this.feedback.clear();
    this.photoHead.reset();
    this.threatNearby = false;
    Object.assign(this.player, { x: WORLD_CENTER.x, y: WORLD_CENTER.y, px: WORLD_CENTER.x, py: WORLD_CENTER.y, hp: this.combatAttributes().maxHp, angle: -Math.PI / 2, invulnerable: 0.8, dx: 0, dy: -1 });
    this.body.reset(this.player.x, this.player.y);
    this.elapsed = 0; this.kills = 0; this.combo = 0; this.bestCombo = 0; this.deaths = 0; this.comboTime = 0;
    this.rack = createWeaponRack(this.run?.getLoadout() ?? this.loadout);
    for (const slot of this.rack) this.guns[slot.slot].setTexture(`gun-${slot.weapon}`).setVisible(slot.equipped);
    this.gripOffsets = WEAPON_SLOTS.map(({ x, y }) => ({ x, y }));
    this.claimedTargets.clear();
    this.spawnTimer = 0; this.frames.length = 0; this.frameCursor = 0; this.lastFrame = 0;
    this.running = true; this.paused = false;
    if (this.settings.mode === 'dummy') this.seedDummies(); else this.spawnInitialEnemies();
    this.feedback.ring(this.player.x, this.player.y, 70, 0xffb767);
    this.resumeControls();
  }
  private stats(): Stats {
    const boss = this.enemies.find(e => e.active && isBossKind(e.kind));
    const viewport = cameraScrollFor(this.player.x, this.player.y);
    return { boss: boss ? { name: ENEMY_DEFS[boss.kind].name, hp: Math.max(0, Math.ceil(boss.hp)), maxHp: boss.maxHp, wave: this.run?.wave ?? 0 } : null,
      world: { ...WORLD, playerX: this.player.x, playerY: this.player.y, viewportX: viewport.x, viewportY: viewport.y, viewportWidth: VIEWPORT.width, viewportHeight: VIEWPORT.height },
      run: this.run?.snapshot(this.run.waveDuration - this.waveElapsed) ?? null, ready: this.ready, running: this.running, paused: this.paused,
      weapons: this.rack.map(({ slot, equipped, weapon, level, xp }) => ({ slot, equipped, weapon, level, xp, nextXp: equipped ? nextWeaponXp(level) : null })),
      pointerLock: this.pointerLock?.state ?? 'idle', pointerLockMessage: this.pointerLockMessage,
      elapsed: this.elapsed, kills: this.kills, combo: this.combo, bestCombo: this.bestCombo, hp: Math.ceil(this.player.hp), maxHp: this.combatAttributes().maxHp,
      enemyCount: this.enemies.filter(e => e.active).length, fps: Math.round(this.game.loop.actualFps || 60), frameP95: this.p95,
      pressureTier: pressureAt(this.pressureTime(), this.settings.mode).tier,
      renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas', deaths: this.deaths };
  }
  private emit(): void {
    if (this.frames.length) { const sorted = [...this.frames].sort((a, b) => a - b); this.p95 = Math.round(sorted[Math.floor((sorted.length - 1) * 0.95)] * 10) / 10; }
    publishStats(this.stats());
  }
  update(_time: number, delta: number): void {
    if (!this.ready) return;
    const now = performance.now();
    if (this.lastFrame && this.running && !this.paused) {
      this.frames[this.frameCursor++ % 180] = now - this.lastFrame;
    }
    this.lastFrame = now;
    this.uiTimer += delta;
    if (this.uiTimer > 125) { this.uiTimer = 0; this.emit(); }
    const input = this.readInput();
    if (!this.running || this.paused) { this.draw(1, Math.min(delta / 1000, 0.05)); return; }
    this.accumulator += Math.min(delta / 1000, 0.05);
    let simulated = 0;
    while (this.accumulator >= STEP) { this.accumulator -= STEP; this.tick(STEP, input); simulated += STEP; if (!this.running || this.paused) break; }
    this.feedback.update(simulated);
    this.draw(clamp(this.accumulator / STEP, 0, 1), Math.min(delta / 1000, 0.05));
  }
  private readInput(): { x: number; y: number } {
    let x = Number(this.inputKeys.has('KeyD') || this.inputKeys.has('ArrowRight')) - Number(this.inputKeys.has('KeyA') || this.inputKeys.has('ArrowLeft')) + this.touch.x;
    let y = Number(this.inputKeys.has('KeyS') || this.inputKeys.has('ArrowDown')) - Number(this.inputKeys.has('KeyW') || this.inputKeys.has('ArrowUp')) + this.touch.y;
    this.gamepadMove = { x: 0, y: 0 };
    let pad: Gamepad | null | undefined;
    try { pad = navigator.getGamepads?.()?.find(p => p?.connected); }
    catch { /* HTTP or browser permissions can block gamepads; other controls remain available. */ }
    if (pad) {
      const magnitude = Math.hypot(pad.axes[0] || 0, pad.axes[1] || 0);
      if (magnitude > 0.18) {
        this.lastInputKind = 'gamepad';
        const amount = clamp((magnitude - 0.18) / 0.82, 0, 1);
        this.gamepadMove = { x: pad.axes[0] / magnitude * amount, y: pad.axes[1] / magnitude * amount };
        x += this.gamepadMove.x; y += this.gamepadMove.y;
      }
    }
    if (Math.hypot(x, y) > 0.01) this.pointer.stopSteering();
    return normaliseInput(x, y);
  }
  private tick(dt: number, input: { x: number; y: number }): void {
    if (!this.running || this.paused || (this.run && this.run.phase !== 'combat')) return;
    if (this.run && bossForWave(this.run.wave) && this.run.bossDefeated) {
      this.bossVictoryDelay = Math.max(0, this.bossVictoryDelay - dt);
      if (this.bossVictoryDelay <= 0) this.finishWave();
      return;
    }
    this.elapsed += dt;
    if (this.run) {
      this.waveElapsed = Math.min(this.run.waveDuration, this.waveElapsed + dt);
      const bossWave = bossForWave(this.run.wave) !== null;
      if ((bossWave && this.run.bossDefeated) || (!bossWave && this.waveElapsed >= this.run.waveDuration - 1e-8)) {
        this.finishWave(); return;
      }
    }
    const p = this.player;
    const attributes = this.combatAttributes();
    this.lifeStealCooldown = Math.max(0, this.lifeStealCooldown - dt);
    p.hp = Math.min(attributes.maxHp, p.hp + regenPerSecond(attributes.hpRegen) * dt);
    p.px = p.x; p.py = p.y;
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    const speed = playerMoveSpeed(this.settings.speed, attributes.speedBonus);
    p.x += input.x * speed * dt; p.y += input.y * speed * dt;
    const movementLength = Math.hypot(input.x, input.y);
    if (movementLength > 0.01) { p.dx = input.x / movementLength; p.dy = input.y / movementLength; }
    p.x = clamp(p.x, BOUNDS.left + 10, BOUNDS.right - 10); p.y = clamp(p.y, BOUNDS.top + 10, BOUNDS.bottom - 10);
    for (const slot of this.rack) advanceWeapon(slot, dt);
    this.shakeCooldown = Math.max(0, this.shakeCooldown - dt);
    if (this.comboTime > 0) { this.comboTime -= dt; if (this.comboTime <= 0) this.combo = 0; }
    this.spawnTimer -= dt;
    if (this.settings.mode !== 'dummy' && this.spawnTimer <= 0 && (!this.run || this.waveElapsed < this.run.waveDuration)) {
      const pressure = this.run ? wavePressure(this.run.wave, this.settings.mode) : pressureAt(this.pressureTime(), this.settings.mode);
      const bossWave = this.run && bossForWave(this.run.wave);
      const count = this.enemies.reduce((n, e) => n + Number(e.active && !isBossKind(e.kind)), 0);
      const target = Math.ceil(pressure.target * (bossWave ? 0.5 : 1));
      for (let i = 0; i < Math.min(pressure.batch, target - count); i++) this.spawnEnemy();
      this.spawnTimer = pressure.interval * (bossWave ? 1.5 : 1);
    }
    this.grid.rebuild(this.enemies);
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.kind !== 'dummy' && !isBossKind(e.kind) && Math.hypot(e.x - p.x, e.y - p.y) > 1100) {
        this.deactivateEnemy(e); continue;
      }
      e.px = e.x; e.py = e.y; e.flash = Math.max(0, e.flash - dt);
      if (e.spawn > 0) { e.spawn = Math.max(0, e.spawn - dt); continue; }
      if (e.kind !== 'dummy') {
        const intent = isBossKind(e.kind) ? stepBossBrain(e.brain, e.kind, e, p, dt) : stepEnemyBrain(e.brain, e.kind, e, p, dt);
        let sepX = 0, sepY = 0;
        this.grid.query(e.x, e.y, e.radius + MAX_ENEMY_RADIUS + 10, this.nearby);
        for (const other of this.nearby) {
          if (other === e || other.spawn > 0) continue;
          const sx = e.x - other.x, sy = e.y - other.y, sq = sx * sx + sy * sy, desired = e.radius + other.radius + 3;
          if (sq < desired * desired && sq > 0.01) {
            const length = Math.sqrt(sq), push = (desired - length) * 5;
            sepX += sx / length * push; sepY += sy / length * push;
          }
        }
        const separation = e.brain.state === 'rush' ? 0.15 : 1;
        e.x += (intent.vx + clamp(sepX, -90, 90) * separation + e.vx) * dt;
        e.y += (intent.vy + clamp(sepY, -90, 90) * separation + e.vy) * dt;
        if (intent.fire) this.spawnEnemyVolley(e);
      } else { e.x += e.vx * dt; e.y += e.vy * dt; }
      e.vx *= Math.exp(-10 * dt); e.vy *= Math.exp(-10 * dt);
      e.x = clamp(e.x, BOUNDS.left + e.radius, BOUNDS.right - e.radius); e.y = clamp(e.y, BOUNDS.top + e.radius, BOUNDS.bottom - e.radius);
      if (e.kind !== 'dummy' && p.invulnerable <= 0 && segmentCircle(e.px - p.px, e.py - p.py, e.x - p.x, e.y - p.y, 0, 0, e.radius + 15)) this.hurt(e);
    }
    if (!this.running) return;
    this.grid.rebuild(this.enemies);
    this.claimedTargets.clear();
    for (const slot of this.rack) {
      if (!slot.equipped) continue;
      const grip = this.gripOffsets[slot.slot];
      const origin = { x: p.x + grip.x, y: p.y + grip.y };
      const target = pickWeaponTarget(slot, origin.x, origin.y, this.enemies, this.claimedTargets);
      if (!target) { slot.targetId = null; continue; }
      // Initial timers already stagger hands. Retargeting must not restart a
      // slow weapon's windup whenever another hand kills its selected enemy.
      slot.targetId = target.id;
      this.claimedTargets.add(target.id);
      // Keep a committed melee arc stable until the hand has recovered.
      if (slot.swingLeft <= 0) slot.angle = Math.atan2(target.y - origin.y, target.x - origin.x);
      if (slot.slot === 0) p.angle = slot.angle;
      if (slot.cooldown <= 0) this.fire(slot);
    }
    this.updateBullets(dt);
    this.updateSpecialShots(dt);
    this.updateEnemyShots(dt);
    if (this.running) this.updatePickups(dt);
  }
  private fire(slot: WeaponSlotState): void {
    if (!slot.equipped) return;
    const p = this.player;
    const angle = slot.angle;
    // A volley keeps its attributes through flight, explosion and return hits.
    const attributes = this.combatAttributes();
    const stats = { ...weaponStats(slot.weapon, slot.level), damage: scaledWeaponDamage(slot.weapon, slot.level, attributes) };
    // Shoot from the last displayed hand pose, translated to the freshest player
    // position. Recoil happens after the muzzle flash at this firing position.
    const grip = this.gripOffsets[slot.slot];
    const originX = p.x + grip.x, originY = p.y + grip.y;
    const x = originX + Math.cos(angle) * 23, y = originY + Math.sin(angle) * 23;
    triggerWeapon(slot, attackRateMultiplier(attributes));
    this.feedback.shot(slot.weapon);
    this.body.attack(slot.weapon, angle);
    this.photoHead.trigger('angry', stats.kind === 'melee' || stats.kind === 'slam' ? 320 : 160);
    if (stats.kind === 'melee') {
      this.feedback.slash(originX, originY, angle, stats.radius);
      this.grid.query(originX, originY, stats.range + MAX_ENEMY_RADIUS, this.nearby);
      // Damage may respawn a dummy; iterate a stable candidate snapshot.
      const targets = [...this.nearby];
      let connected = false;
      for (const e of targets) {
        if (!e.active || e.spawn > 0 || Math.hypot(e.x - originX, e.y - originY) > stats.range + e.radius) continue;
        if (Math.abs(angleDifference(Math.atan2(e.y - originY, e.x - originX), angle)) > 1.25) continue;
        this.damageEnemy(e, stats.damage, Math.atan2(e.y - originY, e.x - originX), stats.knockback, rollCritical(attributes, Math.random()), attributes);
        connected = true;
      }
      if (connected) this.shake(0.0035);
    } else if (stats.kind === 'projectile') {
      const scatter = slot.weapon === 'scatter';
      this.feedback.muzzle(x, y, angle, stats.color, scatter ? 1.5 : 0.8);
      const critical = rollCritical(attributes, Math.random());
      const count = stats.pellets;
      for (let i = 0; i < count; i++) {
        const shotAngle = angle + (scatter ? (i - (count - 1) / 2) * stats.spread + (Math.random() - 0.5) * 0.045 : (Math.random() - 0.5) * stats.spread);
        this.spawnBullet(x, y, shotAngle, stats.projectileSpeed, stats.damage, stats.life,
          stats.knockback, critical, stats.pierce, originX, originY, scatter ? 0.7 : 1, attributes);
      }
      if (scatter) this.shake(0.0018);
    } else if (stats.kind === 'beam') {
      const targets = beamTargets({ x: originX, y: originY }, angle, stats.range, stats.radius, stats.pierce, this.enemies);
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const last = targets[targets.length - 1];
      const length = targets.length >= stats.pierce && last
        ? clamp((last.x - originX) * dx + (last.y - originY) * dy, 0, stats.range) : stats.range;
      this.feedback.beam(originX, originY, originX + dx * length, originY + dy * length, stats.color, stats.radius);
      const critical = rollCritical(attributes, Math.random());
      for (const e of targets) this.damageEnemy(e, stats.damage, angle, stats.knockback, critical, attributes);
    } else if (stats.kind === 'chain') {
      const targets = chainTargets({ x: originX, y: originY }, slot.targetId ?? -1,
        stats.range, stats.chains, stats.chainRange, this.enemies);
      const points = [{ x: originX, y: originY }, ...targets.map(e => ({ x: e.x, y: e.y }))];
      this.feedback.lightning(points, stats.color);
      targets.forEach((e, i) => this.damageEnemy(e, stats.damage * (1 - i * 0.08),
        Math.atan2(e.y - points[i].y, e.x - points[i].x), stats.knockback, rollCritical(attributes, Math.random()), attributes));
    } else {
      const target = this.enemies.find(e => e.active && e.spawn <= 0 && e.id === slot.targetId);
      if (!target) return;
      if (stats.kind === 'slam') {
        this.blast(target.x, target.y, stats, rollCritical(attributes, Math.random()), attributes);
        this.shake(0.004);
      } else this.spawnSpecialShot(slot, originX, originY, target, stats, attributes);
    }
  }
  private blast(x: number, y: number, stats: ReturnType<typeof weaponStats>, critical: boolean, attributes: RunAttributes): void {
    this.feedback.explosion(x, y, stats.radius, stats.color);
    // Snapshot before damage: killed practice targets can be recycled immediately.
    for (const e of blastTargets({ x, y }, stats.radius, this.enemies)) {
      this.damageEnemy(e, stats.damage, Math.atan2(e.y - y, e.x - x), stats.knockback, critical, attributes);
    }
  }
  private clearSpecialShots(): void {
    for (const shot of this.specialShots) { shot.active = false; shot.sprite.setVisible(false); shot.hit.clear(); }
  }
  private spawnSpecialShot(slot: WeaponSlotState, x: number, y: number, target: Enemy, stats: ReturnType<typeof weaponStats>, attributes: RunAttributes): void {
    let shot = this.specialShots.find(item => !item.active);
    if (!shot) {
      if (this.specialShots.length >= 72) return;
      shot = { active: false, kind: 'coffee', slot: 0, x, y, px: x, py: y, startX: x, startY: y,
        endX: x, endY: y, vx: 0, vy: 0, age: 0, duration: 0, life: 0, returning: false,
        pierce: 0, critical: false, stats, attributes, hit: new Set(),
        sprite: this.add.image(x, y, 'projectile-coffee').setDepth(22) };
      this.specialShots.push(shot);
    }
    const coffee = slot.weapon === 'coffee';
    Object.assign(shot, { active: true, kind: coffee ? 'coffee' : 'folder', slot: slot.slot,
      x, y, px: x, py: y, startX: x, startY: y, endX: target.x, endY: target.y,
      vx: Math.cos(slot.angle) * stats.projectileSpeed, vy: Math.sin(slot.angle) * stats.projectileSpeed,
      age: 0, duration: coffee ? Math.max(0.22, Math.hypot(target.x - x, target.y - y) / stats.projectileSpeed) : stats.range / stats.projectileSpeed,
      life: coffee ? stats.life : Math.max(stats.life, 3.5), returning: false,
      pierce: stats.pierce, critical: rollCritical(attributes, Math.random()), stats, attributes });
    shot.hit.clear();
    shot.sprite.setTexture(coffee ? 'projectile-coffee' : 'projectile-folder').setPosition(x, y)
      .setScale(coffee ? 0.8 : stats.radius / 20 * 0.75).setRotation(slot.angle).setVisible(true);
  }
  private updateSpecialShots(dt: number): void {
    for (const shot of this.specialShots) {
      if (!shot.active) continue;
      shot.px = shot.x; shot.py = shot.y; shot.life -= dt;
      if (shot.kind === 'coffee') {
        shot.age += dt;
        const progress = Math.min(1, shot.age / shot.duration);
        shot.x = shot.startX + (shot.endX - shot.startX) * progress;
        shot.y = shot.startY + (shot.endY - shot.startY) * progress;
        if (progress >= 1) {
          this.blast(shot.endX, shot.endY, shot.stats, shot.critical, shot.attributes);
          shot.active = false;
        }
      } else {
        if (!shot.returning && shot.age >= shot.duration) {
          shot.returning = true; shot.hit.clear(); shot.pierce = shot.stats.pierce;
        }
        shot.age += dt;
        let caught = false;
        if (shot.returning) {
          const grip = this.gripOffsets[shot.slot];
          const dx = this.player.x + grip.x - shot.x, dy = this.player.y + grip.y - shot.y;
          const distance = Math.hypot(dx, dy), travel = Math.min(distance, shot.stats.projectileSpeed * 1.25 * dt);
          shot.vx = distance > 0 ? dx / distance * shot.stats.projectileSpeed * 1.25 : 0;
          shot.vy = distance > 0 ? dy / distance * shot.stats.projectileSpeed * 1.25 : 0;
          shot.x += distance > 0 ? dx / distance * travel : 0;
          shot.y += distance > 0 ? dy / distance * travel : 0;
          caught = distance - travel <= 14;
        } else { shot.x += shot.vx * dt; shot.y += shot.vy * dt; }
        this.grid.query((shot.x + shot.px) / 2, (shot.y + shot.py) / 2,
          Math.hypot(shot.x - shot.px, shot.y - shot.py) / 2 + shot.stats.radius * 0.65 + MAX_ENEMY_RADIUS, this.nearby);
        for (const e of this.nearby) {
          if (shot.pierce <= 0) break;
          if (!e.active || e.spawn > 0 || shot.hit.has(e.id)) continue;
          if (segmentCircle(shot.px, shot.py, shot.x, shot.y, e.x, e.y, e.radius + shot.stats.radius * 0.65)) {
            shot.hit.add(e.id); shot.pierce--;
            this.damageEnemy(e, shot.stats.damage, Math.atan2(shot.vy, shot.vx), shot.stats.knockback, shot.critical, shot.attributes);
          }
        }
        if (caught) shot.active = false;
      }
      if (shot.life <= 0) shot.active = false;
      if (!shot.active) shot.sprite.setVisible(false);
    }
  }
  private shake(strength: number): void {
    if (this.settings.shake <= 0 || this.shakeCooldown > 0) return;
    this.cameras.main.shake(65, strength * this.settings.shake, false); this.shakeCooldown = 0.09;
  }
  private spawnBullet(x: number, y: number, angle: number, speed: number, damage: number, life: number, knockback: number, critical: boolean, pierce: number, originX: number, originY: number, scale: number, attributes: RunAttributes): void {
    let b = this.bullets.find(item => !item.active);
    if (!b) {
      if (this.bullets.length >= 300) return;
      b = { active: false, x, y, px: x, py: y, vx: 0, vy: 0, life, damage, knockback, critical, attributes, pierce, firstSweep: true, hit: new Set(), sprite: this.add.image(x, y, 'bullet').setDepth(20) };
      this.bullets.push(b);
    }
    Object.assign(b, { active: true, x, y, px: originX, py: originY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, damage, knockback, critical, attributes, pierce, firstSweep: true });
    b.hit.clear(); b.sprite.setPosition(x, y).setRotation(angle).setScale(scale).setVisible(true);
  }
  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (!b.firstSweep) { b.px = b.x; b.py = b.y; }
      b.firstSweep = false;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      this.grid.query((b.x + b.px) / 2, (b.y + b.py) / 2, Math.hypot(b.x - b.px, b.y - b.py) / 2 + MAX_ENEMY_RADIUS + 4, this.nearby);
      for (const e of this.nearby) {
        if (!e.active || e.spawn > 0 || b.hit.has(e.id)) continue;
        if (segmentCircle(b.px, b.py, b.x, b.y, e.x, e.y, e.radius + 4)) {
          b.hit.add(e.id);
          this.damageEnemy(e, b.damage, Math.atan2(b.vy, b.vx), b.knockback, b.critical, b.attributes);
          if (--b.pierce <= 0) { b.active = false; break; }
        }
      }
      if (b.life <= 0 || b.x < -80 || b.x > WORLD.width + 80 || b.y < -80 || b.y > WORLD.height + 80) b.active = false;
      if (!b.active) b.sprite.setVisible(false);
    }
  }
  private damageEnemy(e: Enemy, damage: number, angle: number, force: number, critical: boolean, attributes: RunAttributes): void {
    if (!e.active) return;
    if (critical) this.photoHead.trigger('smug', 500);
    const def = ENEMY_DEFS[e.kind];
    const amount = resolveDamage(damage, attributes, critical, enemyDamageMultiplier(e.kind, e.brain.angle, angle));
    e.hp -= amount; e.flash = 0.085;
    const lifeSteal = 'lifeSteal' in attributes ? Number(attributes.lifeSteal) : 0;
    if (amount > 0 && lifeSteal > 0 && this.lifeStealCooldown <= 0 && Math.random() * 100 < lifeSteal) {
      this.player.hp = Math.min(this.combatAttributes().maxHp, this.player.hp + 1);
      this.lifeStealCooldown = 0.1;
    }
    const impulse = force * this.settings.knockback * def.knockback * (e.brain.state === 'rush' ? 0.25 : 1);
    e.vx += Math.cos(angle) * impulse; e.vy += Math.sin(angle) * impulse;
    this.feedback.hit(e.x, e.y, angle, def.color, critical);
    this.feedback.damageText(e.x, e.y - e.radius, amount, critical);
    if (e.hp <= 0) {
      const kind = e.kind, x = e.x, y = e.y;
      this.deactivateEnemy(e);
      this.feedback.death(x, y, def.color, kind === 'heavy' || kind === 'shield' || isBossKind(kind));
      if (isBossKind(kind)) {
        this.run?.defeatBoss();
        this.bossVictoryDelay = 0.7;
        this.clearEnemyShots();
        this.feedback.upgrade(this.player.x, this.player.y, kind === 'manager' ? 0xc39bff : 0xffca6b);
      }
      this.kills++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.comboTime = 2.5;
      const xp = kind === 'dummy' || isBossKind(kind) ? 0 : kind === 'heavy' ? 4 : kind === 'shield' ? 3 : kind === 'runner' ? 1 : 2;
      const upgraded = this.run ? [] : grantWeaponXp(this.rack, xp);
      if (upgraded.length) {
        const level = Math.max(...upgraded.map(slot => this.rack[slot].level));
        this.feedback.upgrade(this.player.x, this.player.y, WEAPON_LEVELS[level - 1].color);
      }
      if (xp > 0) this.spawnPickup(x, y, xp);
      if (this.combo % 10 === 0) this.feedback.ring(this.player.x, this.player.y, 55, 0xffbd75);
      if (kind === 'dummy' && this.settings.mode === 'dummy') this.spawnEnemy('dummy', x, y);
    }
  }
  private hurt(enemy: Enemy): void {
    const p = this.player;
    if (!this.running || this.paused || p.invulnerable > 0 || this.run?.bossDefeated) return;
    const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
    const impulse = 550 * ENEMY_DEFS[enemy.kind].knockback;
    enemy.vx += Math.cos(angle) * impulse; enemy.vy += Math.sin(angle) * impulse;
    this.takeDamage(enemy.damage, angle + Math.PI);
  }
  private takeDamage(damage: number, awayAngle: number): void {
    const p = this.player;
    if (!this.running || this.paused || p.invulnerable > 0 || this.run?.bossDefeated) return;
    const attributes = this.combatAttributes();
    if (attributes.dodge > 0 && Math.random() * 100 < attributes.dodge) {
      p.invulnerable = 0.14;
      this.feedback.ring(p.x, p.y, 35, 0x9fdce2);
      return;
    }
    p.hp -= incomingDamage(damage, attributes.armor);
    p.invulnerable = 0.8;
    this.photoHead.trigger('panic', 700);
    this.body.hurt(awayAngle);
    this.feedback.hurt(p.x, p.y); this.shake(0.005);
    if (p.hp <= 0) {
      this.deaths++;
      if (this.settings.practice) {
        p.hp = attributes.maxHp; p.invulnerable = 2;
        this.clearEnemyShots();
        this.feedback.ring(p.x, p.y, 160, 0xffb567);
        for (const e of this.enemies) {
          if (!e.active) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d < 230) { e.vx += dx / d * 950; e.vy += dy / d * 950; }
        }
      } else { p.hp = 0; this.run?.endRun(); this.running = false; this.resetInput(); this.pointerLock.release(); this.emit(); }
    }
  }
  private clearEnemyShots(): void {
    for (const shot of this.enemyShots) { shot.active = false; shot.sprite.setVisible(false); }
  }
  private spawnEnemyVolley(enemy: Enemy): void {
    if (!this.running || this.settings.mode === 'dummy') return;
    const facing = enemy.brain.angle;
    const x = enemy.x + Math.cos(facing) * (enemy.radius + 8);
    const y = enemy.y + Math.sin(facing) * (enemy.radius + 8);
    const info = isBossKind(enemy.kind) ? bossAttackInfo(enemy.brain, enemy.kind, enemy.hp / enemy.maxHp) : null;
    const angles = info?.angles ?? [0];
    const speed = info?.projectileSpeed ?? ENEMY_VOLLEY.speed;
    const life = info?.projectileLife ?? ENEMY_VOLLEY.life;
    for (const spread of angles) {
      const angle = facing + spread;
      let shot = this.enemyShots.find(item => !item.active);
      if (!shot) {
        if (this.enemyShots.length >= 120) break;
        shot = { active: false, x, y, px: x, py: y, vx: 0, vy: 0, life: 0, damage: 0,
          sprite: this.add.image(x, y, 'enemy-bullet').setDepth(25) };
        this.enemyShots.push(shot);
      }
      Object.assign(shot, { active: true, x, y, px: enemy.x, py: enemy.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, damage: enemy.damage * (info?.damageScale ?? ENEMY_VOLLEY.damageScale) });
      shot.sprite.setVisible(true).setPosition(x, y).setRotation(angle);
    }
    this.feedback.muzzle(x, y, facing, 0xff7296, 0.7);
  }
  private updateEnemyShots(dt: number): void {
    const p = this.player;
    for (const shot of this.enemyShots) {
      if (!shot.active) continue;
      shot.px = shot.x; shot.py = shot.y;
      const step = Math.min(dt, Math.max(0, shot.life));
      shot.x += shot.vx * step; shot.y += shot.vy * step; shot.life -= dt;
      // Sweeps catch crossing shots even at low render frame rates.
      if (segmentCircle(shot.px - p.px, shot.py - p.py, shot.x - p.x, shot.y - p.y, 0, 0, 21)) {
        shot.active = false;
        this.takeDamage(shot.damage, Math.atan2(shot.vy, shot.vx));
      }
      if (shot.life <= 0 || shot.x < -50 || shot.x > WORLD.width + 50 || shot.y < -50 || shot.y > WORLD.height + 50) shot.active = false;
      if (!shot.active) shot.sprite.setVisible(false);
    }
  }
  private seedDummies(): void { for (let i = 0; i < 5; i++) this.spawnEnemy('dummy', WORLD_CENTER.x - 220 + i * 110, WORLD_CENTER.y - 155); }
  private spawnInitialEnemies(): void {
    const boss = this.run ? bossForWave(this.run.wave) : null;
    if (boss) this.spawnEnemy(boss);
    const count = this.run ? Math.ceil(wavePressure(this.run.wave, this.settings.mode).initial * (boss ? 0.5 : 1)) : 16;
    for (let i = 0; i < count; i++) this.spawnEnemy();
  }
  private spawnEnemy(kind?: EnemyKind, atX?: number, atY?: number): void {
    let e = this.enemies.find(item => !item.active);
    if (!e) {
      if (this.enemies.length >= 240) return;
      e = { active: false, id: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, hp: 0, maxHp: 0, radius: 16, speed: 0, kind: 'runner', spawn: 0, flash: 0, phase: 0, damage: 0, brain: createEnemyBrain('runner'),
        sprite: this.add.image(0, 0, 'runner').setDepth(12), shadow: this.add.image(0, 0, 'shadow').setDepth(8) };
      this.enemies.push(e);
    }
    if (!kind) {
      const counts: Partial<Record<EnemyKind, number>> = {};
      for (const enemy of this.enemies) if (enemy.active) counts[enemy.kind] = (counts[enemy.kind] ?? 0) + 1;
      kind = this.run ? chooseWaveEnemyKind(this.run.wave, Math.random(), counts) : chooseEnemyKind(this.pressureTime(), Math.random(), counts);
    }
    const stats = this.run ? waveEnemyStats(kind, this.run.wave) : enemyStats(kind, this.pressureTime());
    const point = enemySpawnPoint(this.player, stats.radius);
    const x = atX ?? point.x, y = atY ?? point.y;
    const brain = isBossKind(kind) ? createBossBrain(kind, Math.random()) : createEnemyBrain(kind, Math.random());
    brain.angle = Math.atan2(this.player.y - y, this.player.x - x);
    Object.assign(e, { active: true, id: ++this.enemySerial, x, y, px: x, py: y, vx: 0, vy: 0, hp: stats.hp, maxHp: stats.hp, radius: stats.radius,
      speed: stats.speed, damage: stats.damage, brain, kind, spawn: isBossKind(kind) ? 1.5 : 0.6, flash: 0, phase: Math.random() * Math.PI * 2 });
    e.sprite.setTexture(kind).setVisible(true).setPosition(x, y).setAlpha(0.3).clearTint();
    e.shadow.setVisible(true).setPosition(x, y + stats.radius).setScale(stats.scale);
  }
  private deactivateEnemy(e: Enemy): void {
    e.active = false; e.sprite.setVisible(false); e.shadow.setVisible(false);
    for (const slot of this.rack) if (slot.targetId === e.id) slot.targetId = null;
  }
  private spawnPickup(x: number, y: number, value: number): void {
    let p = this.pickups.find(item => !item.active);
    if (!p) {
      if (this.pickups.length >= 160) { this.run?.collect(value); return; }
      p = { active: false, x, y, vx: 0, vy: 0, life: 0, value: 0, sprite: this.add.image(x, y, 'pickup').setDepth(6) }; this.pickups.push(p);
    }
    Object.assign(p, { active: true, x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 14, value });
    p.sprite.setVisible(true).setPosition(x, y).setAlpha(1);
  }
  private updatePickups(dt: number): void {
    const attributes = this.combatAttributes();
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.life -= dt;
      const dx = this.player.x - p.x, dy = this.player.y - p.y, distance = Math.hypot(dx, dy) || 1;
      if (distance < pickupRadius(attributes.pickupRange) || p.life < 10) { const speed = Math.min(750, 270 + (14 - p.life) * 85); p.vx = dx / distance * speed; p.vy = dy / distance * speed; }
      else { p.vx *= Math.exp(-6 * dt); p.vy *= Math.exp(-6 * dt); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (distance < 20 || p.life < 0) {
        this.run?.collect(p.value);
        if (distance < 20) { this.feedback.pickup(); if (!this.run) this.player.hp = Math.min(attributes.maxHp, this.player.hp + 0.5); }
        p.active = false; p.sprite.setVisible(false);
      } else p.sprite.setPosition(p.x, p.y).setRotation(this.elapsed * 1.5).setAlpha(Math.min(1, p.life));
    }
  }
  private draw(alpha: number, dt = 0): void {
    const p = this.player;
    // Render the controlled actor at the freshest input position. Interpolation
    // remains on enemies/projectiles and cannot delay the player's own feedback.
    const x = p.x, y = p.y;
    const camera = cameraScrollFor(x, y);
    this.cameras.main.setScroll(camera.x, camera.y);
    const opacity = p.invulnerable > 0 && this.running ? 0.58 + Math.sin(this.elapsed * 45) * 0.3 : 1;
    const pose = this.body.update({ x, y, dt, time: this.elapsed, maxSpeed: this.moveSpeed(),
      aim: p.angle, arms: this.rack.map(slot => ({ slot: slot.slot, angle: slot.angle, recoil: slot.recoil, swing: weaponSwing(slot) })),
      alpha: opacity, paused: this.paused || (!this.running && this.elapsed > 0) });
    this.threatNearby = this.running && hasNearbyThreat(p, this.enemies, this.threatNearby);
    this.photoHead.setThreatNearby(this.threatNearby);
    this.photoHead.update(pose.headX, pose.headY, this.elapsed, pose.moving, pose.directionX, opacity,
      { tilt: pose.headTilt, scaleX: pose.headScaleX, scaleY: pose.headScaleY }, pose.heads);
    this.shadow.setPosition(x, y + 27).setScale(pose.shadowScale);
    for (const grip of pose.grips) {
      this.gripOffsets[grip.slot] = { x: grip.x - x, y: grip.y - y };
      this.guns[grip.slot].setVisible(this.rack[grip.slot].equipped).setPosition(grip.x, grip.y).setRotation(grip.angle)
        .setFlipY(Math.cos(grip.angle) < 0).setAlpha(opacity).setDepth(grip.depth)
        .setScale(0.76 + (this.rack[grip.slot].level - 1) * 0.025);
    }
    this.markings.clear();
    this.markings.lineStyle(1, 0xffc47a, 0.13).strokeCircle(x, y, 29);
    for (const grip of pose.grips) {
      if (!this.rack[grip.slot].equipped) continue;
      const level = this.rack[grip.slot].level;
      this.markings.fillStyle(WEAPON_LEVELS[level - 1].color, 0.8);
      for (let i = 0; i < level; i++) this.markings.fillCircle(grip.x - (level - 1) * 2.5 + i * 5, grip.y + 14, 1.8);
    }
    for (const e of this.enemies) {
      if (!e.active) continue;
      const ex = e.px + (e.x - e.px) * alpha, ey = e.py + (e.y - e.py) * alpha;
      const def = ENEMY_DEFS[e.kind];
      const bracing = e.brain.state === 'windup';
      const squash = e.flash > 0 ? 1.08 : bracing ? 1.1 : 1;
      const moving = e.brain.state === 'move' || e.brain.state === 'rush';
      const ebob = e.kind === 'dummy' ? 0 : e.kind === 'shooter' ? Math.sin(this.elapsed * 4 + e.phase) * 2.5 : moving ? Math.sin(this.elapsed * (e.kind === 'heavy' ? 7 : 13) + e.phase) * 1.8 : 0;
      const lean = e.brain.state === 'rush' ? Math.cos(e.brain.angle) * 0.22 : bracing ? Math.sin(this.elapsed * 55) * 0.03 : moving && e.kind !== 'dummy' ? Math.sin(this.elapsed * 8 + e.phase) * 0.045 : 0;
      e.sprite.setPosition(ex, ey + ebob).setScale(def.scale * squash, def.scale / squash).setRotation(lean).setAlpha(e.spawn > 0 ? 0.3 : 1);
      if (e.flash > 0) e.sprite.setTintFill(0xfff9df); else e.sprite.clearTint();
      e.shadow.setPosition(ex, ey + e.radius);
      if (e.spawn > 0) this.markings.lineStyle(2, def.color, 0.6).strokeCircle(ex, ey, 30 * e.spawn / (isBossKind(e.kind) ? 1.5 : 0.6) + 8);
      else {
        const a = e.brain.angle;
        if (e.kind === 'shield') {
          this.markings.lineStyle(5, 0x9ddeff, 0.85).beginPath().arc(ex, ey, e.radius + 7, a - 1.2, a + 1.2).strokePath();
        }
        if (bracing) {
          const bossInfo = isBossKind(e.kind) ? bossAttackInfo(e.brain, e.kind, e.hp / e.maxHp) : null;
          const charger = bossInfo ? bossInfo.attack === 'charge' : e.kind === 'charger';
          const progress = clamp(1 - e.brain.timer / (bossInfo?.windup ?? (charger ? 0.6 : ENEMY_VOLLEY.windup)), 0, 1);
          const color = charger ? 0xff6b50 : 0xf586d6;
          const length = bossInfo?.range ?? (charger ? 224 : ENEMY_VOLLEY.range);
          const offsets = charger ? [0] : bossInfo?.angles ?? [0];
          for (const offset of offsets) {
            const angle = a + offset;
            const startX = charger ? ex : ex + Math.cos(a) * (e.radius + 8);
            const startY = charger ? ey : ey + Math.sin(a) * (e.radius + 8);
            const tx = startX + Math.cos(angle) * length, ty = startY + Math.sin(angle) * length;
            this.markings.lineStyle(charger ? bossInfo?.width ?? 34 : 5, color, 0.1 + progress * 0.12).lineBetween(startX, startY, tx, ty);
            this.markings.lineStyle(2, color, 0.65 + progress * 0.3).lineBetween(startX, startY, tx, ty);
            this.markings.lineBetween(tx, ty, tx - Math.cos(angle - 0.55) * 12, ty - Math.sin(angle - 0.55) * 12);
            this.markings.lineBetween(tx, ty, tx - Math.cos(angle + 0.55) * 12, ty - Math.sin(angle + 0.55) * 12);
          }
          this.markings.lineStyle(3, color, 0.9).beginPath().arc(ex, ey, e.radius + 9, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2).strokePath();
        }
        if (e.brain.state === 'rush') {
          this.markings.lineStyle(3, 0xffa451, 0.5).lineBetween(ex, ey, ex - Math.cos(a) * 46, ey - Math.sin(a) * 46);
        }
      }
      if (e.hp < e.maxHp && e.spawn <= 0) {
        this.markings.fillStyle(0x071115).fillRoundedRect(ex - 18, ey - e.radius - 14, 36, 4, 2);
        this.markings.fillStyle(def.color).fillRoundedRect(ex - 18, ey - e.radius - 14, 36 * e.hp / e.maxHp, 3, 1);
      }
    }
    for (const e of this.enemies) {
      if (!e.active || !this.claimedTargets.has(e.id)) continue;
      const r = e.radius + 11;
      this.markings.lineStyle(1, 0xffce83, 0.45);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        this.markings.beginPath().arc(e.x, e.y, r, a - 0.16, a + 0.16).strokePath();
      }
    }
    for (const b of this.bullets) if (b.active) b.sprite.setPosition(b.px + (b.x - b.px) * alpha, b.py + (b.y - b.py) * alpha);
    for (const shot of this.specialShots) if (shot.active) {
      const sx = shot.px + (shot.x - shot.px) * alpha, sy = shot.py + (shot.y - shot.py) * alpha;
      if (shot.kind === 'coffee') {
        const progress = Math.min(1, Math.max(0, shot.age - STEP + STEP * alpha) / shot.duration);
        const height = Math.sin(progress * Math.PI) * 58;
        this.markings.fillStyle(0x292331, 0.22).fillEllipse(sx, sy + 3, 14, 6);
        this.markings.lineStyle(1, shot.stats.color, 0.25).strokeCircle(shot.endX, shot.endY, shot.stats.radius);
        shot.sprite.setPosition(sx, sy - height).setRotation(shot.age * 5);
      } else shot.sprite.setPosition(sx, sy).setRotation(shot.age * 14);
    }
    for (const shot of this.enemyShots) if (shot.active) shot.sprite.setPosition(shot.px + (shot.x - shot.px) * alpha, shot.py + (shot.y - shot.py) * alpha);
  }
}
