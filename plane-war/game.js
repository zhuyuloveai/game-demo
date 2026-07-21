(() => {
  "use strict";

  // ===== 画布与尺寸 =====
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elScore = document.getElementById("hud");
  const elBest = document.getElementById("best");
  const elKills = document.getElementById("kills");
  const elTime = document.getElementById("time");
  const elPower = document.getElementById("power");

  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // ===== 输入：Pointer Lock + 相对位移模拟跟手 =====
  // 运行时锁定鼠标在画布内（光标出不去）；用累积位移维护飞机的虚拟绝对坐标，
  // 既锁住光标又保留“飞机跟着鼠标走”的跟手手感。
  const mouse = { x: W / 2, y: H * 0.8 };
  let locked = false;

  function requestLock() {
    canvas.requestPointerLock && canvas.requestPointerLock({ unadjustedMovement: true });
  }

  function onMove(e) {
    if (!locked) return;
    // 累积鼠标位移作为飞机目标坐标，并夹在画布内（碰到边即停）
    mouse.x = clamp(mouse.x + e.movementX, player.r, W - player.r);
    mouse.y = clamp(mouse.y + e.movementY, player.r, H - player.r);
  }
  window.addEventListener("mousemove", onMove);

  // Pointer Lock 状态同步：用户按系统 ESC 退出锁定时也暂停游戏
  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === canvas;
    if (!locked && !state.over) {
      state.paused = true;
      canvas.style.cursor = "default";
    } else if (locked) {
      state.paused = false;
      canvas.style.cursor = "none";
    }
  });

  // 点击/按键用于重新开始
  canvas.addEventListener("pointerdown", () => {
    if (!state.started) { state.started = true; requestLock(); return; }
    if (state.over) reset();
    else if (state.paused) requestLock(); // 点击恢复（会重新进入锁定）
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") { if (state.over) reset(); }
    // 注意：游戏运行中按 ESC 会被浏览器用于退出 Pointer Lock，
    // 由 pointerlockchange 自动暂停，无需在此处理。
  });

  function togglePause() {
    if (state.paused) {
      requestLock(); // 恢复：重新请求锁定
    } else {
      document.exitPointerLock && document.exitPointerLock(); // 暂停：退出锁定，光标自由
    }
  }

  // 游戏首次开始 / 重开时请求锁定
  function startGame() { requestLock(); }

  // ===== 工具 =====
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ===== 玩家 =====
  const player = {
    x: W / 2, y: H * 0.8,
    r: 14,            // 碰撞半径
    power: 1,         // 武器等级 1-5
    fireCooldown: 0,
    fireInterval: 0.11,
    alive: true,
  };

  // ===== 子弹对象池 =====
  const bullets = [];
  const MAX_BULLETS = 200;
  for (let i = 0; i < MAX_BULLETS; i++) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 });

  // ===== 武器等级配置 =====
  // ang: 相对正上方的角度偏移（弧度），0=直射向上
  const WEAPON_LEVELS = [
    // L1 单发
    { interval: 0.11, shots: [{ ox: 0, oy: -18, ang: 0 }] },
    // L2 双发
    { interval: 0.11, shots: [{ ox: -7, oy: -16, ang: 0 }, { ox: 7, oy: -16, ang: 0 }] },
    // L3 三发
    { interval: 0.10, shots: [{ ox: 0, oy: -18, ang: 0 }, { ox: -9, oy: -14, ang: 0 }, { ox: 9, oy: -14, ang: 0 }] },
    // L4 三发直射 + 两发斜射
    { interval: 0.09, shots: [
      { ox: 0, oy: -18, ang: 0 },
      { ox: -9, oy: -14, ang: 0 },
      { ox: 9, oy: -14, ang: 0 },
      { ox: -11, oy: -10, ang: -0.25 },
      { ox: 11, oy: -10, ang: 0.25 },
    ] },
    // L5 三发直射 + 四发斜射（双排）
    { interval: 0.07, shots: [
      { ox: 0, oy: -18, ang: 0 },
      { ox: -9, oy: -14, ang: 0 },
      { ox: 9, oy: -14, ang: 0 },
      { ox: -11, oy: -10, ang: -0.25 },
      { ox: 11, oy: -10, ang: 0.25 },
      { ox: -13, oy: -6, ang: -0.55 },
      { ox: 13, oy: -6, ang: 0.55 },
    ] },
  ];

  // 按当前武器等级发射子弹
  function fireBullet() {
    const lvl = WEAPON_LEVELS[Math.min(player.power - 1, WEAPON_LEVELS.length - 1)];
    const speed = 780;
    for (const s of lvl.shots) {
      for (const b of bullets) {
        if (!b.active) {
          b.active = true;
          b.x = player.x + s.ox;
          b.y = player.y + s.oy;
          b.vx = Math.sin(s.ang) * speed;   // ang=0 时 vx=0 直射
          b.vy = -Math.cos(s.ang) * speed;  // 向上为负
          b.r = 4;
          break;
        }
      }
    }
  }

  // ===== 敌方子弹对象池 =====
  const eBullets = [];
  const MAX_EBULLETS = 120;
  for (let i = 0; i < MAX_EBULLETS; i++) eBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0 });

  // 发射一发敌方子弹（vx/vy 由调用方算好方向）
  function fireEnemyBullet(x, y, vx, vy, r = 5) {
    for (const b of eBullets) {
      if (!b.active) {
        b.active = true;
        b.x = x; b.y = y;
        b.vx = vx; b.vy = vy;
        b.r = r;
        return;
      }
    }
  }

  // 敌机开火：aim 朝玩家发射追踪弹；spread 扇形散射
  function enemyFire(e) {
    if (!e.fire) return;
    const sp = 220; // 敌弹速度
    if (e.fire.kind === "aim") {
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      fireEnemyBullet(e.x, e.y + e.r, (dx / d) * sp, (dy / d) * sp, 5);
    } else if (e.fire.kind === "spread") {
      // 三发扇形，朝下方偏两侧
      for (const off of [-0.45, 0, 0.45]) {
        const a = Math.PI / 2 + off; // 向下为基准
        fireEnemyBullet(e.x, e.y + e.r, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
      }
    }
  }

  // ===== 道具（火力升级）系统 =====
  const powerups = [];
  // 掉落概率：普通机按分值加权，Boss 必掉
  function maybeDropPowerup(x, y, fromBoss) {
    if (fromBoss) {
      powerups.push({ x, y, vy: 70, r: 12 });
      return;
    }
    if (Math.random() < 0.12) powerups.push({ x, y, vy: 90, r: 12 });
  }

  function updatePowerups(dt) {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dt;
      // 出界
      if (p.y - p.r > H) { powerups.splice(i, 1); continue; }
      // 拾取
      const dx = p.x - player.x, dy = p.y - player.y;
      if (dx * dx + dy * dy < (p.r + player.r) * (p.r + player.r)) {
        if (player.power < WEAPON_LEVELS.length) player.power += 1;
        explode(p.x, p.y, "#ffe27a", 10, 0.6);
        powerups.splice(i, 1);
      }
    }
  }

  // ===== Boss 系统 =====
  // 每 BOSS_INTERVAL 秒出现一个 Boss；期间暂停普通刷怪，击杀后恢复。
  const BOSS_INTERVAL = 60;       // Boss 出现间隔（秒）
  const BOSS_ENTER_Y = H * 0.22;  // Boss 巡航高度
  let boss = null;                // 当前 Boss，null 表示无
  let bossTimer = BOSS_INTERVAL;  // 距离下一个 Boss 的倒计时
  let bossSpawnIndex = 0;         // 第几个 Boss（用于难度递增）

  function spawnBoss() {
    bossSpawnIndex += 1;
    const level = bossSpawnIndex;
    const hp = 600 + level * 200;   // 血量随波次递增
    boss = {
      x: W / 2,
      y: -120,
      r: 88,
      hp,
      maxHp: hp,
      vx: 60 + level * 8,          // 巡航速度
      dir: Math.random() < 0.5 ? 1 : -1,
      fireCd: 1.2,
      spin: 0,                    // 环形弹幕旋转角
      phase: 1,                   // 弹幕阶段
      hit: 0,
      alive: true,
    };
  }

  // Boss 弹幕：根据阶段切换
  function bossFire() {
    if (!boss) return;
    const ratio = boss.hp / boss.maxHp;
    boss.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    const sp = 200;

    if (boss.phase === 1) {
      // 阶段1：三连追踪弹
      const dx = player.x - boss.x, dy = player.y - boss.y;
      const d = Math.hypot(dx, dy) || 1;
      for (const off of [-0.18, 0, 0.18]) {
        const ang = Math.atan2(dy, dx) + off;
        fireEnemyBullet(boss.x, boss.y + 20, Math.cos(ang) * sp, Math.sin(ang) * sp, 5.5);
      }
    } else if (boss.phase === 2) {
      // 阶段2：环形弹幕（带旋转）
      boss.spin += 0.4;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + boss.spin;
        fireEnemyBullet(boss.x, boss.y, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
      }
    } else {
      // 阶段3：环形 + 朝玩家追踪混合
      boss.spin += 0.5;
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + boss.spin;
        fireEnemyBullet(boss.x, boss.y, Math.cos(a) * sp, Math.sin(a) * sp, 4.5);
      }
      const dx = player.x - boss.x, dy = player.y - boss.y;
      const d = Math.hypot(dx, dy) || 1;
      fireEnemyBullet(boss.x, boss.y, (dx / d) * (sp + 80), (dy / d) * (sp + 80), 6);
    }
  }

  function updateBoss(dt) {
    if (!boss) return;
    boss.hit = Math.max(0, boss.hit - dt * 4);

    if (boss.y < BOSS_ENTER_Y) {
      // 入场
      boss.y += 90 * dt;
    } else {
      // 巡航：左右往返
      boss.x += boss.vx * boss.dir * dt;
      if (boss.x < boss.r) { boss.x = boss.r; boss.dir = 1; }
      else if (boss.x > W - boss.r) { boss.x = W - boss.r; boss.dir = -1; }
      // 开火
      boss.fireCd -= dt;
      const fireRate = boss.phase === 3 ? 0.7 : boss.phase === 2 ? 1.0 : 1.4;
      if (boss.fireCd <= 0) {
        bossFire();
        boss.fireCd = fireRate;
      }
    }

    // 玩家子弹命中 Boss
    for (const b of bullets) {
      if (!b.active) continue;
      const dx = b.x - boss.x, dy = b.y - boss.y;
      if (dx * dx + dy * dy < (boss.r + b.r) * (boss.r + b.r)) {
        b.active = false;
        boss.hp -= 1;
        boss.hit = 1;
      }
    }

    // 撞玩家
    const ddx = boss.x - player.x, ddy = boss.y - player.y;
    if (ddx * ddx + ddy * ddy < (boss.r + player.r) * (boss.r + player.r)) {
      explode(player.x, player.y, "#5fd0ff", 40, 2.2);
      player.alive = false;
      state.over = true;
      if (state.score > state.best) state.best = state.score;
    }

    // 死亡
    if (boss.hp <= 0) {
      for (let i = 0; i < 4; i++) {
        explode(boss.x + rand(-30, 30), boss.y + rand(-30, 30), "#ffd27a", 20, 1.6);
      }
      explode(boss.x, boss.y, "#ff5a5a", 36, 2.2);
      state.score += 300;
      state.kills += 1;
      maybeDropPowerup(boss.x, boss.y, true);
      boss = null;
      bossTimer = BOSS_INTERVAL;
      // 击杀后立刻清空场上残留敌弹，给玩家喘息
      eBullets.forEach((b) => (b.active = false));
    }
  }

  // ===== 敌机 =====
  const enemies = [];
  let spawnTimer = 0;
  let spawnInterval = 0.9;

  // 敌机类型配置：颜色、体积、速度、血量、分值、开火
  // fire: null=不开火 / { interval:开火间隔, kind: 'aim'|'spread' }
  const ENEMY_TYPES = {
    grunt:  { color: "#ff5a5a", glow: "#ff7a7a", r: [16, 20], vy: [140, 200], hp: 1, score: 10, fire: null },
    zigzag: { color: "#5aff8f", glow: "#7aff9f", r: [16, 20], vy: [110, 150], hp: 2, score: 20, fire: null },
    diver:  { color: "#ffb347", glow: "#ffd27a", r: [13, 17], vy: [300, 380], hp: 1, score: 25, fire: null },
    gunner: { color: "#ff5ad0", glow: "#ff8fe0", r: [18, 22], vy: [70, 100],  hp: 3, score: 30, fire: { interval: 1.6, kind: "spread" } },
    tank:   { color: "#b06bff", glow: "#c98bff", r: [26, 32], vy: [60, 95],   hp: 6, score: 40, fire: { interval: 1.9, kind: "aim" } },
  };

  // 按游戏时长解锁类型并加权抽取，形成难度曲线
  function pickEnemyType() {
    const t = state.time;
    const pool = [["grunt", 1]];
    if (t > 12) pool.push(["zigzag", Math.min((t - 12) / 18, 0.7)]);
    if (t > 25) pool.push(["diver", Math.min((t - 25) / 20, 0.6)]);
    if (t > 30) pool.push(["gunner", Math.min((t - 30) / 20, 0.5)]);
    if (t > 40) pool.push(["tank", Math.min((t - 40) / 30, 0.3)]);
    let total = 0;
    for (const [, w] of pool) total += w;
    let roll = Math.random() * total;
    for (const [name, w] of pool) {
      roll -= w;
      if (roll <= 0) return name;
    }
    return "grunt";
  }

  function spawnEnemy() {
    const name = pickEnemyType();
    const cfg = ENEMY_TYPES[name];
    const r = rand(cfg.r[0], cfg.r[1]);
    const e = {
      type: name,
      x: rand(r, W - r),
      y: -r,
      r,
      vy: rand(cfg.vy[0], cfg.vy[1]),
      hp: cfg.hp,
      score: cfg.score,
      color: cfg.color,
      glow: cfg.glow,
      fire: cfg.fire,
      fireCd: cfg.fire ? rand(0.6, cfg.fire.interval) : 0, // 首次开火留点反应时间
      hit: 0,
      phase: rand(0, Math.PI * 2),
      angle: 0,
    };

    if (name === "zigzag") {
      e.amp = rand(40, 90);
      e.freq = rand(2, 3.4);
      e.baseX = clamp(e.x, r + e.amp, W - r - e.amp);
      e.x = e.baseX;
    } else if (name === "diver") {
      // 出场即朝玩家当前位置俯冲
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const sp = e.vy;
      e.vx = (dx / dist) * sp;
      e.vy = (dy / dist) * sp;
      e.angle = Math.atan2(e.vy, e.vx) - Math.PI / 2;
    }
    enemies.push(e);
  }

  // ===== 粒子（爆炸）=====
  const particles = [];
  function explode(x, y, color, count = 14, power = 1) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 260) * power;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7),
        max: 0.7,
        color,
        r: rand(1.5, 3.5),
      });
    }
    shake = Math.min(shake + 6 * power, 16);
  }

  // ===== 星空背景（滚动，强化速度感）=====
  const stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.9 + 0.1 });
  }

  // ===== 屏幕震动 =====
  let shake = 0;

  // ===== 状态 =====
  const state = { score: 0, kills: 0, best: 0, over: false, paused: false, started: false, time: 0 };

  function reset() {
    state.score = 0;
    state.kills = 0;
    state.over = false;
    state.paused = false;
    state.started = true;
    state.time = 0;
    player.x = W / 2;
    player.y = H * 0.8;
    mouse.x = player.x;
    mouse.y = player.y;
    player.alive = true;
    player.power = 1;
    player.fireCooldown = 0;
    bullets.forEach((b) => (b.active = false));
    eBullets.forEach((b) => (b.active = false));
    enemies.length = 0;
    powerups.length = 0;
    particles.length = 0;
    spawnInterval = 0.9;
    boss = null;
    bossTimer = BOSS_INTERVAL;
    bossSpawnIndex = 0;
    shake = 0;
    startGame(); // 重开后请求 Pointer Lock
  }

  // ===== 主循环 =====
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // 防止切后台后大跳

    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    if (state.over || state.paused || !state.started) return;
    state.time += dt;

    // 难度递增
    spawnInterval = Math.max(0.35, 0.9 - state.time * 0.01);

    // --- 玩家跟手（帧无关平滑插值，目标即 Pointer Lock 累积坐标）---
    const k = 24;
    const t = 1 - Math.exp(-dt * k);
    player.x += (mouse.x - player.x) * t;
    player.y += (mouse.y - player.y) * t;
    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);

    // --- 自动开火（间隔随武器等级提升）---
    player.fireCooldown -= dt;
    const wLvl = WEAPON_LEVELS[Math.min(player.power - 1, WEAPON_LEVELS.length - 1)];
    if (player.fireCooldown <= 0) {
      fireBullet();
      player.fireCooldown = wLvl.interval;
    }

    // --- 子弹移动 ---
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) b.active = false;
    }

    // --- Boss 计时 / 普通敌机生成（Boss 期间暂停刷怪）---
    if (!boss) {
      bossTimer -= dt;
      if (bossTimer <= 0) {
        spawnBoss();
      } else {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy();
          spawnTimer = spawnInterval * rand(0.7, 1.3);
        }
      }
    }

    // --- Boss 更新 ---
    updateBoss(dt);

    // --- 敌机移动 + 与子弹碰撞 ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.hit = Math.max(0, e.hit - dt * 4);

      // 按类型移动
      if (e.type === "zigzag") {
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin((state.time + e.phase) * e.freq) * e.amp;
      } else if (e.type === "diver") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else {
        e.y += e.vy * dt;
      }

      // 开火（敌机进入画面后才开）
      if (e.fire && e.y > e.r) {
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          enemyFire(e);
          e.fireCd = e.fire.interval;
        }
      }

      // 子弹命中
      for (const b of bullets) {
        if (!b.active) continue;
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
          b.active = false;
          e.hp -= 1;
          e.hit = 1;
          if (e.hp <= 0) {
            explode(e.x, e.y, e.glow, e.type === "tank" ? 24 : 16, e.type === "tank" ? 1.6 : 1);
            state.score += e.score;
            state.kills += 1;
            maybeDropPowerup(e.x, e.y, false);
            enemies.splice(i, 1);
            break;
          }
        }
      }
      if (!enemies[i]) continue;

      // 出界（敌机完全离开画面）
      if (e.y - e.r > H || e.x < -e.r - 20 || e.x > W + e.r + 20) {
        enemies.splice(i, 1);
        continue;
      }
      // 撞玩家
      const dx = e.x - player.x, dy = e.y - player.y;
      if (dx * dx + dy * dy < (e.r + player.r) * (e.r + player.r)) {
        explode(player.x, player.y, "#5fd0ff", 40, 2.2);
        explode(e.x, e.y, "#ffb347", 20, 1.4);
        enemies.splice(i, 1);
        player.alive = false;
        state.over = true;
        if (state.score > state.best) state.best = state.score;
      }
    }

    // --- 敌方子弹：移动 + 出界 + 命中玩家 ---
    for (const eb of eBullets) {
      if (!eb.active) continue;
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < -20 || eb.x > W + 20 || eb.y < -20 || eb.y > H + 20) {
        eb.active = false;
        continue;
      }
      const dx = eb.x - player.x, dy = eb.y - player.y;
      if (dx * dx + dy * dy < (eb.r + player.r) * (eb.r + player.r)) {
        eb.active = false;
        explode(player.x, player.y, "#5fd0ff", 40, 2.2);
        player.alive = false;
        state.over = true;
        if (state.score > state.best) state.best = state.score;
      }
    }

    // --- 道具更新 ---
    updatePowerups(dt);

    // --- 粒子 ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }

    // --- 星空 ---
    for (const s of stars) {
      s.y += (40 + s.z * 260) * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }

    // --- 震动衰减 ---
    shake *= Math.pow(0.0001, dt);

    // --- HUD ---
    elScore.textContent = state.score;
    elBest.textContent = state.best;
    elKills.textContent = state.kills;
    elTime.textContent = state.time.toFixed(0) + "s";
    elPower.textContent = "Lv" + player.power;
  }

  function render() {
    ctx.save();
    // 屏幕震动
    if (shake > 0.3) {
      ctx.translate(rand(-shake, shake), rand(-shake, shake));
    }

    // 背景
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // 星空
    for (const s of stars) {
      ctx.globalAlpha = 0.2 + s.z * 0.7;
      ctx.fillStyle = s.z > 0.7 ? "#bfe6ff" : "#5a7aa0";
      ctx.fillRect(s.x, s.y, s.z * 2, s.z * 5);
    }
    ctx.globalAlpha = 1;

    // 子弹
    for (const b of bullets) {
      if (!b.active) continue;
      ctx.fillStyle = "#aef";
      ctx.shadowColor = "#7fd0ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 敌方子弹（粉红辉光，区别于我方蓝色弹）
    for (const eb of eBullets) {
      if (!eb.active) continue;
      ctx.fillStyle = "#ffd0e6";
      ctx.shadowColor = "#ff5ad0";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 道具（旋转金色菱形）
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(state.time * 2);
      ctx.fillStyle = "#ffe27a";
      ctx.shadowColor = "#ffae42";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.lineTo(p.r, 0);
      ctx.lineTo(0, p.r);
      ctx.lineTo(-p.r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // 中心 P 字
      ctx.fillStyle = "#5a3a00";
      ctx.font = "bold 13px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P", p.x, p.y);
    }
    ctx.shadowBlur = 0;
    ctx.textBaseline = "alphabetic";

    // 敌机
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.fillStyle = e.hit > 0 ? "#fff" : e.color;
      ctx.shadowColor = e.glow;
      ctx.shadowBlur = e.hit > 0 ? 18 : 8;
      const r = e.r;
      ctx.beginPath();
      if (e.type === "tank") {
        // 六边形重装机
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (e.type === "zigzag") {
        // 菱形机动兵
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
      } else if (e.type === "diver") {
        // 尖箭头俯冲机
        ctx.moveTo(0, -r * 1.2);
        ctx.lineTo(r * 0.7, r);
        ctx.lineTo(0, r * 0.5);
        ctx.lineTo(-r * 0.7, r);
        ctx.closePath();
      } else if (e.type === "gunner") {
        // 带炮管的五边形炮手
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.95, -r * 0.3);
        ctx.lineTo(r * 0.6, r * 0.8);
        ctx.lineTo(-r * 0.6, r * 0.8);
        ctx.lineTo(-r * 0.95, -r * 0.3);
        ctx.closePath();
      } else {
        // grunt 杂兵三角
        ctx.moveTo(0, r);
        ctx.lineTo(-r, -r * 0.6);
        ctx.lineTo(0, -r * 0.3);
        ctx.lineTo(r, -r * 0.6);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Boss
    if (boss) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      // 主体：八角星形，颜色随阶段变红
      const ratio = boss.hp / boss.maxHp;
      const col = ratio > 0.66 ? "#b06bff" : ratio > 0.33 ? "#ff6bb5" : "#ff4040";
      ctx.fillStyle = boss.hit > 0 ? "#fff" : col;
      ctx.shadowColor = col;
      ctx.shadowBlur = boss.hit > 0 ? 24 : 14;
      const r = boss.r;
      ctx.beginPath();
      const points = 8;
      for (let k = 0; k < points * 2; k++) {
        const rr = k % 2 === 0 ? r : r * 0.62;
        const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // 核心
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Boss 血条（顶部）
    if (boss) {
      const barW = W * 0.7, barH = 8;
      const bx = (W - barW) / 2, by = 14;
      ctx.fillStyle = "rgba(80,180,255,0.12)";
      ctx.fillRect(bx, by, barW, barH);
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = ratio > 0.66 ? "#b06bff" : ratio > 0.33 ? "#ff6bb5" : "#ff4040";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillRect(bx, by, barW * ratio, barH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#aef";
      ctx.textAlign = "center";
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.fillText("BOSS", W / 2, by - 3);
    }

    // 玩家
    if (player.alive) {
      ctx.save();
      ctx.translate(player.x, player.y);
      // 引擎尾焰
      const flame = 6 + Math.sin(state.time * 40) * 3;
      ctx.fillStyle = "#ffd27a";
      ctx.shadowColor = "#ffae42";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-5, 10);
      ctx.lineTo(0, 10 + flame);
      ctx.lineTo(5, 10);
      ctx.closePath();
      ctx.fill();

      // 机身
      ctx.fillStyle = "#7fd0ff";
      ctx.shadowColor = "#5fd0ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(-12, 10);
      ctx.lineTo(0, 5);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fill();
      // 驾驶舱
      ctx.fillStyle = "#eaf7ff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 粒子
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.restore();

    // 开始遮罩
    if (!state.started && !state.over) {
      ctx.fillStyle = "rgba(5,6,10,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7fd0ff";
      ctx.textAlign = "center";
      ctx.font = "bold 30px -apple-system, sans-serif";
      ctx.fillText("雷霆战机", W / 2, H / 2 - 18);
      ctx.font = "15px -apple-system, sans-serif";
      ctx.fillStyle = "#8fd0ff";
      ctx.fillText("点击画布开始", W / 2, H / 2 + 14);
      ctx.font = "12px -apple-system, sans-serif";
      ctx.fillStyle = "#5a7aa0";
      ctx.fillText("ESC 暂停 · R 重开", W / 2, H / 2 + 40);
    }

    // 暂停遮罩
    if (state.paused && !state.over) {
      ctx.fillStyle = "rgba(5,6,10,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7fd0ff";
      ctx.textAlign = "center";
      ctx.font = "bold 32px -apple-system, sans-serif";
      ctx.fillText("已暂停", W / 2, H / 2 - 8);
      ctx.font = "15px -apple-system, sans-serif";
      ctx.fillStyle = "#8fd0ff";
      ctx.fillText("点击画布继续", W / 2, H / 2 + 24);
    }

    // 游戏结束遮罩
    if (state.over) {
      ctx.fillStyle = "rgba(5,6,10,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7fd0ff";
      ctx.textAlign = "center";
      ctx.font = "bold 32px -apple-system, sans-serif";
      ctx.fillText("游戏结束", W / 2, H / 2 - 10);
      ctx.font = "16px -apple-system, sans-serif";
      ctx.fillStyle = "#aef";
      ctx.fillText("最终分数: " + state.score, W / 2, H / 2 + 22);
      ctx.fillStyle = "#8fd0ff";
      ctx.fillText("点击屏幕或按 R 重新开始", W / 2, H / 2 + 50);
    }
  }

  requestAnimationFrame(frame);
})();
