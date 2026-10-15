import Phaser from 'phaser';
import { WORLD, WORLD_BOUNDS } from './WorldModel';
import { createBossTextures } from './BossTextures';

const INK = 0x262a3e;
const PAPER = 0xfffbef;

export function createTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const save = (name: string, width: number, height = width) => { g.generateTexture(name, width, height); g.clear(); };
  const box = (x: number, y: number, w: number, h: number, r: number, color: number, line = 2.5) => {
    g.fillStyle(color).fillRoundedRect(x, y, w, h, r);
    if (line > 0) g.lineStyle(line, INK).strokeRoundedRect(x, y, w, h, r);
  };
  const circle = (x: number, y: number, r: number, color: number, line = 2.5) => {
    g.fillStyle(color).fillCircle(x, y, r);
    if (line > 0) g.lineStyle(line, INK).strokeCircle(x, y, r);
  };
  const polygon = (points: [number, number][], color: number, line = 2.5) => {
    g.fillStyle(color).lineStyle(line, INK).beginPath().moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
    g.closePath().fillPath();
    if (line > 0) g.strokePath();
  };
  g.fillStyle(0x242331, 0.20).fillEllipse(32, 32, 48, 20); save('shadow', 64);

  // A charging file folder: paper antennae, stamping feet and a toothy grin.
  box(14, 52, 12, 8, 3, INK, 2);
  box(39, 52, 12, 8, 3, INK, 2);
  polygon([[11, 29], [4, 32], [5, 41], [13, 39]], 0x79cba6, 2);
  polygon([[53, 28], [59, 32], [58, 41], [51, 39]], 0x79cba6, 2);
  box(12, 13, 21, 12, 3, 0x66bb98);
  box(22, 7, 30, 31, 2, 0xdce7e8, 2);
  box(18, 11, 31, 29, 2, PAPER, 2);
  g.lineStyle(1.5, 0x8497a3).lineBetween(23, 17, 41, 17).lineBetween(23, 21, 44, 21);
  polygon([[9, 24], [55, 23], [51, 53], [13, 53]], 0x8cdbad, 3);
  g.lineStyle(2, 0xc6f2cc).lineBetween(15, 27, 48, 26);
  box(43, 20, 11, 11, 1, 0xffd875, 1.5);
  circle(23, 35, 6, PAPER, 2);
  circle(42, 34, 6, PAPER, 2);
  circle(25, 35, 2.2, INK, 0);
  circle(40, 34, 2.2, INK, 0);
  g.lineStyle(3, INK).lineBetween(17, 28, 28, 31).lineBetween(37, 30, 47, 27);
  box(24, 43, 18, 6, 2, INK, 1);
  g.fillStyle(PAPER).fillRect(27, 43, 4, 3).fillRect(34, 43, 4, 3);
  save('runner', 64);

  // Broad-shouldered manager monster, carrying a briefcase and an oversized tie.
  box(13, 56, 16, 6, 3, INK, 2);
  box(37, 56, 16, 6, 3, INK, 2);
  box(7, 25, 50, 32, 10, 0x7e729f, 3);
  box(4, 31, 12, 20, 5, 0x6b608d, 2.5);
  circle(10, 50, 5, 0xe7b395, 2);
  polygon([[5, 28], [14, 23], [23, 28], [19, 36], [5, 37]], 0xbbb1ca, 3);
  polygon([[41, 28], [50, 23], [59, 28], [59, 37], [45, 36]], 0xbbb1ca, 3);
  g.lineStyle(2, 0xe5dceb).lineBetween(9, 29, 16, 27).lineBetween(47, 28, 53, 29);
  for (const x of [9, 18, 47, 55]) circle(x, 33, 1.5, 0x60566e, 0);
  polygon([[23, 27], [32, 49], [41, 27]], PAPER, 2);
  polygon([[18, 25], [29, 30], [24, 36], [31, 48], [18, 38]], 0xa29ab8, 2);
  polygon([[46, 25], [35, 30], [40, 36], [33, 48], [46, 38]], 0xa29ab8, 2);
  polygon([[29, 31], [35, 31], [34, 36], [36, 44], [32, 48], [28, 44], [30, 36]], 0xf07e82, 1.5);
  circle(32, 17, 13, 0xe9c3a5, 3);
  g.fillStyle(0x605267).fillEllipse(24, 9, 11, 7).fillEllipse(40, 9, 11, 7);
  box(22, 15, 9, 7, 2, PAPER, 1.5);
  box(34, 15, 9, 7, 2, PAPER, 1.5);
  g.lineStyle(2, INK).lineBetween(30, 18, 34, 18).lineBetween(23, 11, 30, 13).lineBetween(35, 13, 42, 11);
  g.fillStyle(INK).fillRect(27, 17, 2, 3).fillRect(36, 17, 2, 3);
  g.lineStyle(2, INK).lineBetween(28, 25, 36, 25);
  box(50, 36, 9, 7, 2, 0xd3a56e, 2);
  box(45, 41, 17, 16, 3, 0xb57a50, 2.5);
  g.lineStyle(1.5, INK).lineBetween(47, 48, 60, 48);
  g.fillStyle(0xffd67c).fillRect(52, 46, 4, 4);
  for (const [x, y] of [[48, 44], [59, 44], [48, 54], [59, 54]]) circle(x, y, 1.3, 0xffd67c, 0);
  save('heavy', 64);

  // Deadline clock: a round orange silhouette, twin bells and sharp stamping boots.
  polygon([[18, 47], [26, 49], [25, 56], [16, 59], [11, 56]], INK, 2);
  polygon([[39, 49], [47, 47], [53, 56], [47, 59], [39, 56]], INK, 2);
  g.lineStyle(4, INK).lineBetween(18, 17, 12, 10).lineBetween(46, 17, 52, 10);
  g.fillStyle(0xffb65e).fillEllipse(12, 11, 20, 12).fillEllipse(52, 11, 20, 12);
  g.lineStyle(2.5, INK).strokeEllipse(12, 11, 20, 12).strokeEllipse(52, 11, 20, 12);
  box(28, 3, 8, 9, 2, 0xffc86c, 2);
  circle(32, 32, 22, 0xef7550, 3);
  circle(32, 31, 17, 0xffeed0, 2);
  g.lineStyle(2, 0xe39868).lineBetween(32, 17, 32, 20).lineBetween(18, 31, 21, 31).lineBetween(43, 31, 46, 31);
  g.lineStyle(3, INK).lineBetween(20, 26, 28, 29).lineBetween(36, 29, 44, 26);
  circle(25, 32, 2.3, INK, 0);
  circle(39, 32, 2.3, INK, 0);
  g.lineStyle(2.5, 0xd94542).lineBetween(32, 28, 32, 22).lineBetween(32, 28, 38, 24);
  box(25, 38, 14, 5, 1.5, INK, 1);
  g.fillStyle(PAPER).fillRect(28, 38, 3, 2).fillRect(34, 38, 3, 2);
  polygon([[26, 48], [38, 48], [35, 53], [38, 59], [32, 62], [27, 58], [29, 53]], 0xd93948, 2);
  g.lineStyle(2, 0xffd493).lineBetween(17, 18, 20, 16).lineBetween(44, 16, 47, 18);
  save('charger', 64);

  // Blame launcher: a purple printer on little treads, with a large envelope muzzle.
  box(10, 49, 18, 11, 4, INK, 2);
  box(37, 49, 18, 11, 4, INK, 2);
  for (const x of [14, 21, 41, 48]) g.lineStyle(1.5, 0x9385af).lineBetween(x, 52, x, 57);
  box(22, 4, 24, 24, 2, 0xe5d8f3, 2);
  box(17, 8, 26, 23, 2, PAPER, 2);
  g.lineStyle(1.5, 0xb2a1bf).lineBetween(22, 13, 37, 13).lineBetween(22, 17, 34, 17);
  box(8, 21, 49, 32, 7, 0xa17ac8, 3);
  box(12, 25, 40, 9, 3, 0xc8a7e3, 1.5);
  circle(17, 28, 2, 0xffd278, 0);
  g.lineStyle(3, INK).lineBetween(29, 24, 36, 27).lineBetween(41, 27, 48, 24);
  g.fillStyle(PAPER).fillRect(29, 28, 6, 3).fillRect(41, 28, 6, 3);
  circle(33, 29, 1.2, INK, 0);
  circle(42, 29, 1.2, INK, 0);
  box(18, 36, 33, 14, 4, 0x514360, 2.5);
  box(22, 38, 25, 8, 2, 0x272635, 1.5);
  polygon([[27, 39], [43, 39], [48, 47], [25, 47]], 0xf7dcec, 1.5);
  g.lineStyle(1.5, 0xd55282).lineBetween(28, 40, 35, 44).lineBetween(35, 44, 42, 40);
  g.lineStyle(2, 0xd9b4ef).lineBetween(12, 38, 12, 45).lineBetween(54, 37, 54, 44);
  save('shooter', 64);

  // Approval barrier: broad blue armour and a shield that occupies most of its body.
  box(13, 53, 15, 8, 3, INK, 2);
  box(36, 53, 15, 8, 3, INK, 2);
  box(9, 23, 45, 30, 9, 0x6e91a9, 3);
  polygon([[4, 25], [14, 20], [24, 27], [18, 36], [4, 34]], 0xa1bbca, 2.5);
  polygon([[40, 27], [50, 20], [60, 25], [60, 34], [46, 36]], 0xa1bbca, 2.5);
  circle(32, 16, 13, 0x90aab9, 3);
  polygon([[19, 15], [45, 15], [43, 24], [21, 24]], 0x374557, 2);
  g.fillStyle(0xffc885).fillRect(24, 17, 6, 3).fillRect(35, 17, 6, 3);
  g.lineStyle(2, 0xd8e7e8).lineBetween(23, 9, 32, 6).lineBetween(32, 6, 41, 9);
  // A stamp handle peeks out behind the shield on its right.
  box(52, 29, 7, 14, 2, 0xcb806b, 2);
  box(48, 40, 14, 8, 2, 0xf0b291, 2);
  polygon([[11, 30], [32, 25], [53, 30], [50, 49], [43, 57], [32, 62], [21, 57], [14, 49]], 0xc2d4dc, 3);
  polygon([[17, 34], [32, 30], [47, 34], [44, 48], [39, 53], [32, 57], [25, 53], [20, 48]], 0x547d98, 2);
  g.lineStyle(2, 0x7da4ba).lineBetween(32, 31, 32, 55);
  // The oversized approval seal reads at small scale without any lettering.
  circle(32, 43, 9, 0xffdf94, 2);
  g.lineStyle(3, 0x8e6744).beginPath().moveTo(27, 43).lineTo(31, 47).lineTo(38, 39).strokePath();
  for (const [x, y] of [[15, 33], [49, 33], [20, 52], [44, 52]]) circle(x, y, 1.4, PAPER, 0);
  save('shield', 64);

  // Clipboard training target.
  box(28, 47, 8, 13, 2, 0xa98465, 2);
  box(17, 58, 31, 5, 2, 0x7e6e67, 2);
  box(12, 9, 40, 44, 5, 0xd6b080, 3);
  box(16, 13, 32, 35, 2, PAPER, 1.5);
  box(23, 5, 18, 10, 3, 0xbccbd2, 2);
  circle(32, 31, 12, 0xed8d83, 2);
  circle(32, 31, 7, PAPER, 1.5);
  circle(32, 31, 3, 0xed8d83, 0);
  save('dummy', 64);

  // Bright, chunky office equipment. Every weapon points right; its grip is left.
  box(3, 20, 40, 8, 3, 0x69788d, 2.5);
  box(8, 24, 10, 6, 2, INK, 1.5);
  polygon([[5, 10], [31, 4], [44, 12], [40, 20], [11, 23]], 0xf27e58, 3);
  g.lineStyle(2.5, 0xffc497).lineBetween(12, 11, 30, 7).lineBetween(30, 7, 36, 10);
  box(29, 17, 16, 5, 1.5, 0xdde9eb, 1.5);
  circle(11, 18, 4, 0xffd475, 2);
  save('gun-stapler', 48, 32);

  box(9, 24, 12, 12, 3, INK, 2);
  box(23, 3, 25, 13, 2, PAPER, 2);
  g.lineStyle(1.5, 0x9a9bab).lineBetween(28, 6, 44, 6).lineBetween(28, 9, 41, 9);
  box(4, 11, 41, 22, 5, 0xaaa0d7, 3);
  box(7, 15, 12, 11, 3, 0xc2b9e9, 1.5);
  box(39, 12, 14, 20, 3, 0x4b4966, 2.5);
  g.fillStyle(0xe9e3fd).fillRect(44, 15, 9, 3).fillRect(44, 21, 10, 3).fillRect(44, 27, 8, 3);
  g.lineStyle(2, INK).lineBetween(24, 17, 24, 26).lineBetween(29, 17, 29, 26).lineBetween(34, 17, 34, 26);
  circle(13, 20, 2, 0xffd66f, 0);
  save('gun-scatter', 56, 40);

  box(2, 5, 60, 24, 5, 0x5faba7, 3);
  box(5, 7, 54, 18, 3, 0xcee9df, 1.5);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 7; col++) {
    box(8 + col * 7, 9 + row * 6, 5, 4, 1, col === 6 ? 0xf69b84 : PAPER, 0.7);
  }
  box(19, 21, 25, 4, 1, PAPER, 1);
  box(48, 21, 8, 4, 1, 0xffd678, 1);
  save('gun-keyboard', 64, 32);

  // Laser pointer: striped grip, chrome barrel and a bright lens at the right tip.
  box(3, 10, 15, 12, 4, 0x53667c, 2.5);
  for (const x of [7, 11, 15]) g.lineStyle(1.5, 0x96a9ba).lineBetween(x, 12, x, 20);
  box(17, 11, 26, 10, 3, 0xe08ebe, 2.5);
  box(25, 7, 9, 5, 2, 0xffd777, 1.5);
  g.lineStyle(2, 0xffd5ed).lineBetween(21, 13, 38, 13);
  box(40, 9, 10, 14, 3, 0xb4c9d6, 2);
  box(47, 12, 6, 8, 2, 0xff637f, 1.5);
  g.fillStyle(PAPER).fillCircle(51, 15, 1.5);
  save('gun-laser', 56, 32);

  // Takeaway mug: the handle is a clear handhold, the lid and coffee splash face right.
  box(4, 15, 19, 19, 6, 0xd49465, 3);
  box(9, 20, 11, 9, 3, INK, 0);
  polygon([[20, 10], [48, 10], [45, 39], [25, 39]], PAPER, 3);
  polygon([[22, 20], [47, 20], [46, 31], [24, 31]], 0xc48659, 1.5);
  g.fillStyle(0x653e3a).fillEllipse(35, 25, 9, 12);
  g.lineStyle(1.5, 0xeac398).beginPath().moveTo(36, 20).lineTo(33, 24).lineTo(36, 30).strokePath();
  box(18, 7, 32, 7, 3, 0x5c6178, 2.5);
  box(35, 4, 12, 5, 2, 0x343747, 1.5);
  g.lineStyle(2, 0xffdab0).lineBetween(26, 34, 26, 36);
  save('gun-coffee', 56, 44);

  // Outgoing paperwork: layered sheets and a metal clip add a readable boomerang edge.
  box(3, 17, 17, 12, 3, 0x546f8b, 2.5);
  polygon([[14, 11], [32, 7], [37, 13], [56, 9], [60, 32], [20, 38]], 0xe6a648, 3);
  polygon([[19, 10], [49, 5], [55, 28], [24, 34]], 0xe4ebef, 2);
  polygon([[23, 7], [52, 9], [54, 28], [22, 32]], PAPER, 2);
  g.lineStyle(1.5, 0x9cafba).lineBetween(29, 13, 46, 14).lineBetween(29, 17, 48, 18);
  polygon([[16, 19], [58, 15], [58, 34], [20, 38]], 0xffd078, 2.5);
  g.lineStyle(2, 0xffedbf).lineBetween(22, 23, 51, 20);
  box(43, 17, 8, 12, 2, 0x6d8a9e, 1.5);
  g.lineStyle(1.5, PAPER).lineBetween(46, 20, 48, 20).lineBetween(46, 23, 48, 23);
  save('gun-folder', 64, 44);

  // Rubber stamp held sideways like a mallet: left handle, chunky red stamping face.
  box(4, 17, 26, 12, 5, 0xa36b55, 3);
  g.lineStyle(2, 0xe3aa7f).lineBetween(8, 20, 23, 20);
  box(25, 13, 13, 20, 4, 0xdca77e, 2.5);
  box(35, 6, 18, 34, 5, 0xcc737f, 3);
  box(48, 8, 10, 30, 3, 0x73485f, 2.5);
  g.lineStyle(2, 0xffc1bd).lineBetween(39, 11, 44, 11).lineBetween(39, 15, 39, 28);
  g.lineStyle(2, 0xffdfa0).beginPath().moveTo(51, 21).lineTo(53, 25).lineTo(56, 18).strokePath();
  save('gun-stamp', 64, 46);

  // Coiled charging lead: teal insulated cable ending in a gold USB plug.
  g.lineStyle(8, INK).beginPath().moveTo(8, 26).lineTo(13, 15).lineTo(20, 10)
    .lineTo(30, 12).lineTo(34, 20).lineTo(30, 30).lineTo(20, 31).lineTo(17, 24)
    .lineTo(23, 18).lineTo(32, 18).lineTo(45, 20).strokePath();
  g.lineStyle(4.5, 0x80d5e0).beginPath().moveTo(8, 26).lineTo(13, 15).lineTo(20, 10)
    .lineTo(30, 12).lineTo(34, 20).lineTo(30, 30).lineTo(20, 31).lineTo(17, 24)
    .lineTo(23, 18).lineTo(32, 18).lineTo(45, 20).strokePath();
  box(3, 23, 12, 12, 3, 0x69859c, 2);
  box(39, 13, 15, 14, 3, 0xbde7df, 2.5);
  box(51, 16, 10, 8, 1.5, 0xf4c675, 2);
  g.lineStyle(1.2, 0x90744d).lineBetween(54, 18, 58, 18).lineBetween(54, 21, 58, 21);
  polygon([[46, 15], [42, 20], [46, 20], [44, 25], [51, 18], [47, 18]], 0x4c91a2, 0);
  save('gun-cable', 64, 40);

  // Thrown items retain their equipment silhouette at projectile scale.
  box(2, 10, 9, 12, 4, 0xc1855e, 2);
  box(5, 13, 6, 6, 2, INK, 0);
  polygon([[10, 7], [26, 7], [24, 25], [13, 25]], PAPER, 2);
  polygon([[12, 13], [25, 13], [24, 20], [13, 20]], 0xbc7953, 1);
  circle(19, 16, 2.5, 0x684342, 0);
  box(9, 4, 19, 5, 2, 0x585e73, 2);
  save('projectile-coffee', 32);

  polygon([[3, 9], [14, 6], [19, 10], [29, 8], [29, 25], [6, 28]], 0xe4a345, 2);
  polygon([[7, 5], [24, 3], [27, 21], [10, 25]], PAPER, 1.5);
  g.lineStyle(1, 0xa3afbb).lineBetween(11, 9, 22, 8).lineBetween(11, 12, 23, 11);
  polygon([[4, 14], [29, 11], [29, 25], [6, 28]], 0xffd078, 2);
  box(21, 12, 5, 7, 1, 0x7793a5, 1);
  g.lineStyle(1.5, 0xfff1d1).lineBetween(9, 17, 19, 16);
  save('projectile-folder', 32);

  polygon([[3, 5], [23, 4], [30, 8], [23, 12], [3, 11], [7, 8]], 0xffd263, 2);
  g.lineStyle(2, PAPER).lineBetween(10, 7, 23, 7);
  save('bullet', 32, 16);

  // Enemy mail has a white rim and a red diamond halo, distinct from gold player shots.
  polygon([[12, 1], [23, 12], [12, 23], [1, 12]], 0xe74775, 0);
  g.lineStyle(2, PAPER).beginPath().moveTo(12, 1).lineTo(23, 12).lineTo(12, 23).lineTo(1, 12).closePath().strokePath();
  box(5, 7, 14, 10, 2, 0xffb6c7, 1.5);
  g.lineStyle(1.5, 0xa32258).lineBetween(6, 8, 12, 13).lineBetween(12, 13, 18, 8);
  g.lineStyle(1.2, PAPER).lineBetween(7, 16, 10, 13).lineBetween(17, 16, 14, 13);
  save('enemy-bullet', 24);

  box(3, 2, 10, 12, 2, 0xa3dfbb, 1.5);
  g.lineStyle(1.5, PAPER).lineBetween(6, 5, 10, 5).lineBetween(6, 8, 9, 8);
  g.fillStyle(0x557c68).fillRect(6, 10, 5, 2);
  save('pickup', 16);
  g.destroy();
  createBossTextures(scene);
}

export function createArena(scene: Phaser.Scene): void {
  const { width, height } = WORLD;
  const g = scene.add.graphics().setDepth(0);
  if (scene.textures.exists('office-background')) {
    scene.add.image(width / 2, height / 2, 'office-background').setDisplaySize(width, height).setDepth(-2);
    g.fillStyle(0x1e202a, 0.08).fillRect(0, 0, width, 45).fillRect(0, height - 45, width, 45);
    g.fillStyle(0x1e202a, 0.06).fillRect(0, 45, 45, height - 90).fillRect(width - 45, 45, 45, height - 90);
  } else {
    g.fillStyle(0xc8c4b8).fillRect(0, 0, width, height);
    g.fillStyle(0xdedbcf).fillRoundedRect(42, 44, width - 84, height - 88, 12);
    for (let x = 140; x < width - 100; x += 275) {
      for (const y of [20, height - 60]) {
        g.fillStyle(0x5e6465, 0.16).fillRoundedRect(x - 65, y + 8, 134, 42, 6);
        g.fillStyle(0xa99b88).fillRoundedRect(x - 69, y, 134, 37, 5);
        g.fillStyle(0x414d59).fillRoundedRect(x - 28, y + 1, 49, 20, 3);
        g.fillStyle(0x91b2b8).fillRoundedRect(x - 24, y + 4, 41, 13, 2);
      }
    }
  }
  const b = WORLD_BOUNDS;
  g.lineStyle(1, 0x514f4b, 0.2).strokeRoundedRect(b.left, b.top, b.right - b.left, b.bottom - b.top, 15);
  g.lineStyle(2, 0xfffae7, 0.35);
  for (const [x, y, dx, dy] of [[b.left, b.top, 1, 1], [b.right, b.top, -1, 1], [b.left, b.bottom, 1, -1], [b.right, b.bottom, -1, -1]]) {
    g.lineBetween(x, y, x + 20 * dx, y).lineBetween(x, y, x, y + 20 * dy);
  }
}
