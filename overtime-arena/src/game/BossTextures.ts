import Phaser from 'phaser';

/** Oversized office silhouettes remain readable above the smaller enemy crowd. */
export function createBossTextures(scene: Phaser.Scene): void {
  const ink = 0x282439, paper = 0xfff4dc;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const box = (x: number, y: number, w: number, h: number, r: number, color: number, line = 3) => {
    g.fillStyle(color).fillRoundedRect(x, y, w, h, r);
    if (line) g.lineStyle(line, ink).strokeRoundedRect(x, y, w, h, r);
  };
  const circle = (x: number, y: number, radius: number, color: number, line = 3) => {
    g.fillStyle(color).fillCircle(x, y, radius);
    if (line) g.lineStyle(line, ink).strokeCircle(x, y, radius);
  };
  const polygon = (points: [number, number][], color: number, line = 3) => {
    g.fillStyle(color).lineStyle(line, ink).beginPath().moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) g.lineTo(x, y);
    g.closePath().fillPath();
    if (line) g.strokePath();
  };

  // Performance manager: giant orange jacket, checklist and red appraisal stamp.
  box(25, 82, 19, 10, 4, ink);
  box(54, 82, 19, 10, 4, ink);
  box(12, 33, 72, 51, 17, 0xcc645c, 4);
  box(7, 40, 19, 32, 8, 0xe67e64);
  box(70, 40, 18, 30, 8, 0xe67e64);
  polygon([[29, 34], [48, 72], [66, 34]], paper);
  polygon([[27, 34], [41, 43], [36, 51], [47, 74], [25, 57]], 0xf09c72);
  polygon([[69, 34], [56, 43], [61, 51], [49, 74], [71, 57]], 0xf09c72);
  polygon([[43, 41], [53, 41], [51, 49], [55, 66], [48, 72], [41, 66], [45, 49]], 0x992f49, 2);
  circle(48, 22, 19, 0xf3bd92, 3.5);
  g.fillStyle(0x513a40).fillEllipse(47, 8, 37, 13).fillEllipse(30, 17, 8, 18);
  box(31, 17, 15, 10, 3, paper, 2);
  box(51, 17, 15, 10, 3, paper, 2);
  g.lineStyle(3, ink).lineBetween(46, 21, 51, 21).lineBetween(33, 12, 44, 16).lineBetween(53, 16, 64, 12);
  circle(41, 22, 2, ink, 0); circle(56, 22, 2, ink, 0);
  g.lineStyle(3, ink).lineBetween(41, 33, 55, 33);
  box(3, 57, 26, 32, 3, 0xb77b51, 3);
  box(6, 60, 20, 25, 2, paper, 1);
  box(9, 54, 14, 7, 2, 0xf4c874, 2);
  for (const y of [66, 73, 80]) {
    g.lineStyle(2, 0xa24745).lineBetween(9, y, 11, y + 2).lineBetween(11, y + 2, 14, y - 2);
    g.lineStyle(1.5, 0xb4a28e).lineBetween(17, y, 23, y);
  }
  circle(80, 64, 8, 0xf3bd92);
  box(75, 65, 11, 14, 4, 0x942c46, 2);
  box(67, 78, 28, 12, 3, 0xd94e60, 3);
  g.lineStyle(2, 0xffbfaa).lineBetween(73, 82, 88, 82);
  g.generateTexture('manager', 96, 96); g.clear();

  // Overtime chairman: gold-edged executive chair, crown clock, and twin cannons.
  box(21, 13, 86, 93, 21, 0x4b3c70, 4);
  box(27, 18, 74, 83, 17, 0x7c5598, 3);
  g.lineStyle(3, 0xe7bb6e).strokeRoundedRect(22, 14, 84, 92, 21);
  for (const x of [36, 64, 92]) circle(x, 28, 2, 0xddbb82, 0);
  box(28, 106, 24, 15, 5, ink);
  box(77, 106, 24, 15, 5, ink);
  circle(36, 116, 5, 0x8f82ae, 2); circle(93, 116, 5, 0x8f82ae, 2);
  box(28, 54, 73, 58, 15, 0x403853, 4);
  polygon([[42, 56], [64, 101], [84, 56]], paper);
  polygon([[42, 54], [59, 66], [51, 73], [63, 98], [38, 78]], 0x705c82);
  polygon([[84, 54], [69, 66], [77, 73], [65, 98], [91, 78]], 0x705c82);
  polygon([[60, 64], [69, 64], [67, 73], [73, 93], [64, 102], [56, 93], [62, 73]], 0xd59d54, 2);
  circle(64, 43, 22, 0xe8ba99, 4);
  g.fillStyle(0xc7ccd2).fillEllipse(45, 33, 13, 23).fillEllipse(83, 33, 13, 23);
  g.fillStyle(ink).fillRoundedRect(43, 37, 18, 11, 3).fillRoundedRect(67, 37, 18, 11, 3);
  g.lineStyle(3, ink).lineBetween(60, 42, 68, 42);
  g.lineStyle(2, 0xeac47e).lineBetween(46, 39, 53, 43).lineBetween(71, 39, 77, 43);
  g.lineStyle(3, ink).lineBetween(56, 56, 72, 56);
  polygon([[41, 25], [38, 8], [51, 17], [64, 3], [76, 17], [91, 8], [87, 26]], 0xefc56c, 3);
  circle(64, 17, 9, paper, 2);
  g.lineStyle(2, 0x9d5072).lineBetween(64, 17, 64, 11).lineBetween(64, 17, 69, 20);
  box(7, 61, 27, 44, 8, 0x705987, 3);
  box(95, 61, 27, 44, 8, 0x705987, 3);
  box(3, 72, 34, 26, 6, 0xa57eae, 3);
  box(92, 72, 34, 26, 6, 0xa57eae, 3);
  for (const x of [9, 98]) {
    box(x, 77, 22, 15, 3, 0x332940, 2);
    g.lineStyle(2, 0xe0b47a).lineBetween(x + 3, 80, x + 18, 80);
    g.fillStyle(0xec9cb5).fillRect(x + 4, 86, 14, 3);
  }
  for (const x of [40, 88]) circle(x, 99, 3, 0xefc56c, 1.5);
  g.generateTexture('director', 128, 128);
  g.destroy();
}
