// ===== 可变游戏世界状态（模块间共享的对象引用）=====
export const WORLD_W = 5000; // 世界总宽度（像素）

// 玩家：y 为脚底坐标，方便与平地判定
export const player = {
  x: 120, y: 0,
  vx: 0, vy: 0,
  w: 16, h: 34,       // 站立碰撞盒；蹲下 h 变为 22
  dir: 1,             // 朝向 1 右 / -1 左
  grounded: false,
  crouch: false,
  coyote: 0,          // 土狼时间
  jumpBuf: 0,         // 跳跃预输入缓冲
  fireCd: 0,
  flash: 0,           // 枪口闪光计时
  alive: true,
};

// ===== 子弹对象池 =====
export const bullets = [];
const MAX_BULLETS = 64;
for (let i = 0; i < MAX_BULLETS; i++) {
  bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 4, ttl: 0 });
}

// ===== 敌人（跑动兵）=====
export const enemies = [];

// ===== 粒子 =====
export const particles = [];

// ===== 背景星星（x 为视差层坐标）=====
export const stars = [];
for (let i = 0; i < 140; i++) {
  stars.push({ x: Math.random() * 2400, y: Math.random(), p: Math.random() * 0.5 + 0.1 });
}

// ===== 镜头 =====
export const camera = { x: 0 };

// ===== 屏幕震动 =====
export const shakeState = { value: 0 };

// ===== 刷怪 =====
export const spawnState = { timer: 1.2 };
