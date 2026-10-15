import Phaser from 'phaser';
import { CombatScene } from './game/CombatScene';
import { mountUI } from './ui';
import './style.css';

mountUI();
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-host',
  width: 1120,
  height: 720,
  backgroundColor: '#101a1e',
  antialias: true,
  roundPixels: false,
  powerPreference: 'high-performance',
  banner: false,
  audio: { noAudio: true },
  input: { keyboard: false, gamepad: false, mouse: false, touch: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1120, height: 720 },
  scene: [CombatScene],
});
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
