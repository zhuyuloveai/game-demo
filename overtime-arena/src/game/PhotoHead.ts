import Phaser from 'phaser';
import type { AvatarExpression } from '../shared';
import { isAvatarDataUrl } from '../avatar';
import { resolveAvatarExpression } from './AvatarThreat';

export interface PhotoHeadAnchor {
  x: number;
  y: number;
  tilt: number;
  scale: number;
}

/** A front portrait and outward-facing side heads attached at their chins. */
export class PhotoHead {
  private scene: Phaser.Scene;
  private heads: { face: Phaser.GameObjects.Image; ink: Phaser.GameObjects.Graphics }[];
  private expression: AvatarExpression = 'neutral';
  private until = 0;
  private priority = 0;
  private threatNearby = false;
  private version = 0;
  private disposed = false;
  private customKey: string | null = null;
  private defaultKey: string;
  private defaultProfileKey: string;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (!scene.textures.exists('avatar-fallback')) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xf6cba3).fillCircle(32, 32, 29);
      g.fillStyle(0x30343a).fillRoundedRect(6, 3, 52, 17, 9);
      g.fillStyle(0x222730).fillEllipse(22, 30, 4, 6).fillEllipse(42, 30, 4, 6);
      g.lineStyle(2, 0x654139).lineBetween(23, 44, 40, 44);
      g.generateTexture('avatar-fallback', 64, 64); g.destroy();
    }
    this.defaultKey = scene.textures.exists('default-avatar') ? 'default-avatar' : 'avatar-fallback';
    this.defaultProfileKey = scene.textures.exists('default-avatar-profile') ? 'default-avatar-profile' : this.defaultKey;
    // Side heads sit behind the central head; weapons occupy depth 18.
    this.heads = [19, 21, 19].map((depth, index) => ({
      face: scene.add.image(560, 360, index === 1 ? this.defaultKey : this.defaultProfileKey).setOrigin(0.5, 0.94)
        .setFlipX(index === 2).setDepth(depth).setVisible(index === 1),
      ink: scene.add.graphics().setDepth(depth + 1).setVisible(index === 1),
    }));
  }

  setPhoto(dataUrl: string | null): void {
    if (this.disposed) return;
    const version = ++this.version;
    if (dataUrl === null) { this.replaceTexture(this.defaultKey, null); return; }
    if (!isAvatarDataUrl(dataUrl)) return;
    const picture = new Image();
    picture.onload = () => {
      if (this.disposed || version !== this.version) return;
      const key = `avatar-photo-${version}`;
      if (this.scene.textures.addImage(key, picture)) this.replaceTexture(key, key);
    };
    picture.onerror = () => { /* The upload panel validates and decodes before applying. */ };
    picture.src = dataUrl;
  }

  private replaceTexture(key: string, customKey: string | null): void {
    if (this.disposed) return;
    const previous = this.customKey;
    for (let index = 0; index < this.heads.length; index++) {
      this.heads[index].face.setTexture(customKey === null && index !== 1 ? this.defaultProfileKey : key);
    }
    this.customKey = customKey;
    if (previous && previous !== key) this.scene.textures.remove(previous);
  }

  trigger(expression: AvatarExpression, duration = 450, preview = false): void {
    const priority = preview ? 10 : expression === 'panic' ? 3 : expression === 'furious' ? 2.5 : expression === 'smug' ? 2 : 1;
    if (!preview && performance.now() < this.until && priority < this.priority) return;
    this.expression = expression; this.until = performance.now() + duration; this.priority = priority;
  }
  setThreatNearby(value: boolean): void { this.threatNearby = value; }
  reset(): void { this.expression = 'neutral'; this.until = 0; this.priority = 0; this.threatNearby = false; }

  update(x: number, y: number, time: number, moving: boolean, directionX: number, alpha: number,
    body: { tilt: number; scaleX: number; scaleY: number }, heads?: readonly PhotoHeadAnchor[]): void {
    const now = performance.now();
    const active = now < this.until;
    const e = resolveAvatarExpression(active ? this.expression : 'neutral', this.threatNearby, active && this.priority === 10);
    for (let index = 0; index < this.heads.length; index++) {
      const layer = this.heads[index];
      const anchor = heads?.[index];
      const visible = heads ? !!anchor : index === 1;
      layer.face.setVisible(visible); layer.ink.setVisible(visible);
      if (!visible) continue;
      const side = index !== 1;
      const profile = side && this.customKey === null && this.defaultProfileKey !== this.defaultKey;
      const builtInPortrait = this.customKey === null && this.defaultKey !== 'avatar-fallback';
      const scale = anchor?.scale ?? 1;
      // Uploaded photos stay local. Their side heads use a modest 2D projection;
      // only the built-in portrait has a separately generated profile view.
      const projection = side && !profile ? 0.82 : 1;
      const sx = body.scaleX * scale * projection * (e === 'furious' ? 1.17 : e === 'angry' ? 1.12 : e === 'panic' ? 0.92 : e === 'smug' ? 1.07 : 1);
      const sy = body.scaleY * scale * (e === 'furious' ? 0.9 : e === 'angry' ? 0.92 : e === 'panic' ? 1.13 : e === 'smug' ? 0.96 : 1);
      const wobble = Math.sin(now / 65 + index * 0.7);
      const expressionTilt = side ? 0 : e === 'furious' ? wobble * 0.035 : e === 'panic' ? wobble * 0.1 : e === 'smug' ? -0.14 : moving ? directionX * 0.025 : Math.sin(time * 2) * 0.015;
      const tilt = (anchor?.tilt ?? body.tilt) + expressionTilt;
      // Anchors already contain body tilt and bob. Each face pivots at its own chin.
      const chinX = anchor?.x ?? x;
      const chinY = anchor?.y ?? y;
      // The new portrait's hair extends below the chin. Attach by the jaw,
      // independently of the bitmap's lowest hair pixels.
      layer.face.setOrigin(profile ? index === 2 ? 0.72 : 0.28 : 0.5, builtInPortrait ? profile ? 0.86 : 0.895 : 0.94)
        .setPosition(chinX, chinY).setDisplaySize(46 * sx, 50 * sy).setRotation(tilt).setAlpha(alpha);
      const centerOffset = (builtInPortrait ? 18 : 22) * sy;
      // The profile's chin and features sit left of the bitmap center.
      const featureX = profile ? 7 * sx * (index === 2 ? -1 : 1) : 0;
      const featureY = profile ? 1 * sy : 0;
      layer.ink.clear().setPosition(chinX + Math.sin(tilt) * centerOffset + Math.cos(tilt) * featureX - Math.sin(tilt) * featureY,
        chinY - Math.cos(tilt) * centerOffset + Math.sin(tilt) * featureX + Math.cos(tilt) * featureY)
        .setRotation(tilt).setScale((index === 2 ? -sx : sx) * (builtInPortrait ? 0.75 : 1), sy).setAlpha(alpha);
      if (side) this.drawProfileExpression(layer.ink, e);
      else this.drawExpression(layer.ink, e);
    }
  }

  private drawProfileExpression(g: Phaser.GameObjects.Graphics, e: AvatarExpression): void {
    // Coordinates face left; the right head mirrors this entire layer.
    if (e === 'furious' || e === 'angry') {
      if (e === 'furious') g.fillStyle(0xf35d50, 0.28).fillEllipse(-5, 6, 14, 11);
      g.fillStyle(0xffedcb).fillEllipse(-10, -2, 11, 7);
      g.fillStyle(0x292332).fillCircle(-12, -1, 1.8);
      g.lineStyle(e === 'furious' ? 3.5 : 3, 0x292332).lineBetween(-16, -5, -3, -11);
      g.fillStyle(0x48202c).fillRoundedRect(-17, 5, 13, 9, 2);
      g.fillStyle(0xfff7df).fillRoundedRect(-15, 6, 9, 5, 1);
      g.lineStyle(1, 0x48202c).lineBetween(-15, 8, -6, 8).lineBetween(-11, 6, -11, 11);
      g.lineStyle(2.5, 0xff6555).lineBetween(-26, -22, -20, -22).lineBetween(-23, -25, -23, -19);
      if (e === 'furious') g.lineStyle(2.5, 0xfff4d9, 0.85).lineBetween(-26, -8, -29, -14).lineBetween(-29, -14, -26, -19);
    } else if (e === 'panic') {
      g.fillStyle(0xfffcec).fillEllipse(-10, -2, 12, 15);
      g.lineStyle(1.5, 0x25313a).strokeEllipse(-10, -2, 12, 15);
      g.fillStyle(0x26323b).fillCircle(-12, -1, 2.2);
      g.fillStyle(0x452438).fillEllipse(-12, 10, 9, 13);
      g.fillStyle(0xf49899).fillEllipse(-11, 14, 6, 3);
      g.fillStyle(0x68d8f2).fillTriangle(6, -10, 2, 0, 10, 0).fillCircle(6, 0, 4);
    } else if (e === 'smug') {
      g.lineStyle(2.7, 0x2b2630).lineBetween(-15, -5, -9, -7).lineBetween(-9, -7, -4, -4);
      g.lineStyle(2, 0x542d38).beginPath().arc(-11, 5, 6, 0.15, Math.PI - 0.2).strokePath();
      g.fillStyle(0xffd369).fillTriangle(-25, -23, -29, -14, -21, -14).fillTriangle(-25, -5, -29, -14, -21, -14);
    }
  }

  private drawExpression(g: Phaser.GameObjects.Graphics, e: AvatarExpression): void {
    if (e === 'furious') {
      g.fillStyle(0xf35d50, 0.26).fillEllipse(-14, 6, 14, 11).fillEllipse(14, 6, 14, 11);
      g.fillStyle(0xffedcb).fillEllipse(-9, -2, 14, 8).fillEllipse(9, -2, 14, 8);
      g.fillStyle(0x292332).fillCircle(-7, -1, 2).fillCircle(7, -1, 2);
      g.lineStyle(4, 0x292332).lineBetween(-19, -11, -3, -3).lineBetween(3, -3, 19, -11);
      g.fillStyle(0x48202c).fillRoundedRect(-13, 9, 26, 12, 3);
      g.fillStyle(0xfff7df).fillRoundedRect(-10, 11, 20, 7, 1);
      g.lineStyle(1.3, 0x48202c).lineBetween(-10, 14, 10, 14).lineBetween(-3, 11, -3, 18).lineBetween(4, 11, 4, 18);
      g.lineStyle(3, 0xff6555).lineBetween(23, -24, 29, -24).lineBetween(26, -27, 26, -21);
      g.lineBetween(31, -17, 37, -17).lineBetween(34, -20, 34, -14);
      g.lineStyle(3, 0xfff4d9, 0.85).lineBetween(-29, -10, -33, -17).lineBetween(-33, -17, -29, -24);
    } else if (e === 'angry') {
      g.lineStyle(3.5, 0x24232c).lineBetween(-17, -9, -5, -4).lineBetween(5, -4, 17, -9);
      g.fillStyle(0x412333).fillRoundedRect(-10, 8, 20, 10, 4);
      g.fillStyle(0xfff9e7).fillRect(-8, 9, 16, 3);
      g.lineStyle(2.5, 0xff745d).lineBetween(22, -22, 28, -22).lineBetween(25, -25, 25, -19);
      g.lineBetween(19, -28, 23, -32);
    } else if (e === 'panic') {
      g.fillStyle(0xfffcec).fillEllipse(-9, -5, 15, 17).fillEllipse(9, -5, 15, 17);
      g.lineStyle(1.5, 0x25313a).strokeEllipse(-9, -5, 15, 17).strokeEllipse(9, -5, 15, 17);
      g.fillStyle(0x26323b).fillCircle(-9, -4, 2.5).fillCircle(9, -4, 2.5);
      g.fillStyle(0x452438).fillEllipse(0, 13, 13, 16);
      g.fillStyle(0xf49899).fillEllipse(0, 18, 8, 4);
      g.fillStyle(0x68d8f2).fillTriangle(27, -9, 23, 2, 32, 2).fillCircle(27.5, 2, 4.5);
      g.lineStyle(2, 0xffecd0).lineBetween(-29, -14, -34, -23).lineBetween(-25, -19, -26, -30);
    } else if (e === 'smug') {
      g.lineStyle(3, 0x2b2630).lineBetween(-16, -5, -10, -7).lineBetween(-10, -7, -4, -4);
      g.lineStyle(2.5, 0x542d38).beginPath().arc(1, 7, 10, 0.1, Math.PI - 0.2).strokePath();
      g.fillStyle(0xffd369).fillTriangle(29, -21, 24, -9, 34, -9).fillTriangle(29, 1, 24, -9, 34, -9);
      g.lineStyle(1.5, 0xfff2ce).lineBetween(20, -10, 38, -10);
    }
  }

  destroy(): void {
    this.disposed = true; this.version++;
    for (const head of this.heads) { head.face.destroy(); head.ink.destroy(); }
    if (this.customKey) this.scene.textures.remove(this.customKey);
  }
}
