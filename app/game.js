/* ============================================================
   Space Defender – Game Engine (Canvas-based)
   Electronic Arts Gaming | Azure DevOps CI/CD Project
   ============================================================ */

// ─── State ────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

let state = 'idle'; // 'idle' | 'playing' | 'paused' | 'gameover' | 'levelup'
let score        = 0;
let highScore    = parseInt(localStorage.getItem('spaceDefenderHS') || '0');
let lives        = 3;
let level        = 1;
let frameId      = null;
let lastTime     = 0;
let frameCount   = 0;

// ─── Input ────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); shoot(); }
  if (e.code === 'KeyP')   { togglePause(); }
  if (e.code === 'KeyR')   { restartGame(); }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ─── Player ───────────────────────────────────────────────────
const player = {
  x: W / 2, y: H - 70, w: 48, h: 48,
  speed: 5, dx: 0,
  color: '#a855f7',
  shootCooldown: 0,
  shootRate: 18,   // frames between shots
  invincible: 0,   // frames of invincibility after hit
  thrusterFrame: 0,
};

// ─── Bullets (player) ─────────────────────────────────────────
let bullets = [];

// ─── Enemies ──────────────────────────────────────────────────
let enemies    = [];
let enemySpeed = 1.2;
let enemyDir   = 1;
let enemyDrop  = 16;
let spawnTimer = 0;
const ENEMY_ROWS = 3, ENEMY_COLS = 8;

// ─── Enemy Bullets ────────────────────────────────────────────
let eBullets = [];
let eBulletTimer = 0;

// ─── Particles ────────────────────────────────────────────────
let particles = [];

// ─── Stars (parallax) ─────────────────────────────────────────
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 1.5 + 0.3,
  speed: Math.random() * 0.8 + 0.2,
  opacity: Math.random() * 0.6 + 0.2,
}));

// ─── Explosions ───────────────────────────────────────────────
let explosions = [];

// ─── Power-ups ────────────────────────────────────────────────
let powerUps = [];
let powerUpTimer = 0;

// ═══════════════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════════════
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function drawRoundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

// ═══════════════════════════════════════════════════════════════
//  SPAWN
// ═══════════════════════════════════════════════════════════════
const ENEMY_TYPES = [
  { color: '#f43f5e', pts: 30, hp: 1, emoji: '👾' },
  { color: '#fb923c', pts: 20, hp: 1, emoji: '🛸' },
  { color: '#facc15', pts: 10, hp: 1, emoji: '👽' },
];

function spawnWave() {
  enemies = [];
  const startX = 60, startY = 70;
  const gapX   = (W - startX * 2) / (ENEMY_COLS - 1);
  const gapY   = 60;

  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      const type = ENEMY_TYPES[r % ENEMY_TYPES.length];
      enemies.push({
        x: startX + c * gapX, y: startY + r * gapY,
        w: 38, h: 28,
        hp: type.hp + Math.floor(level / 3),
        pts: type.pts,
        color: type.color,
        emoji: type.emoji,
        frame: 0,
        alive: true,
      });
    }
  }
  enemyDir   = 1;
  enemySpeed = 1.2 + (level - 1) * 0.25;
  eBulletTimer = 120;
}

function spawnParticles(x, y, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const angle  = rand(0, Math.PI * 2);
    const speed  = rand(1, 5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(30, 60),
      maxLife: 50,
      r: rand(2, 5),
      color,
    });
  }
}

function spawnPowerUp(x, y) {
  if (Math.random() > 0.2) return;
  const types = ['rapid', 'shield', 'bomb'];
  powerUps.push({
    x, y, w: 28, h: 28,
    type: types[randInt(0, types.length - 1)],
    vy: 1.5,
    frame: 0,
  });
}

// ═══════════════════════════════════════════════════════════════
//  SHOOT
// ═══════════════════════════════════════════════════════════════
function shoot() {
  if (state !== 'playing') return;
  if (player.shootCooldown > 0) return;
  bullets.push({ x: player.x, y: player.y - player.h / 2, w: 4, h: 18, vy: -10, color: '#c084fc' });
  player.shootCooldown = player.shootRate;
  // Muzzle flash particle
  spawnParticles(player.x, player.y - player.h / 2, '#c084fc', 4);
}

function enemyShoot() {
  const alive = enemies.filter(e => e.alive);
  if (!alive.length) return;
  const shooter = alive[randInt(0, alive.length - 1)];
  eBullets.push({
    x: shooter.x, y: shooter.y + shooter.h / 2,
    w: 4, h: 16, vy: 3.5 + level * 0.15,
    color: '#fb923c',
  });
}

// ═══════════════════════════════════════════════════════════════
//  COLLISION
// ═══════════════════════════════════════════════════════════════
function aabb(a, b) {
  const hw = (a.w + b.w) / 2 - 4;
  const hh = (a.h + b.h) / 2 - 4;
  return Math.abs(a.x - b.x) < hw && Math.abs(a.y - b.y) < hh;
}

// ═══════════════════════════════════════════════════════════════
//  DRAW HELPERS
// ═══════════════════════════════════════════════════════════════
function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) return;

  const { x, y, w, h, color } = player;
  ctx.save();

  // Thruster flame
  player.thrusterFrame++;
  const flameH = 12 + Math.sin(player.thrusterFrame * 0.3) * 5;
  const grad = ctx.createLinearGradient(x, y + h / 2, x, y + h / 2 + flameH + 8);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(0.5, '#fbbf24');
  grad.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h / 2);
  ctx.lineTo(x, y + h / 2 + flameH);
  ctx.lineTo(x + 6, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Ship body
  ctx.shadowColor = color;
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = color;

  // Main body
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.lineTo(x - w * 0.15, y + h * 0.25);
  ctx.lineTo(x, y + h * 0.1);
  ctx.lineTo(x + w * 0.15, y + h * 0.25);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit highlight
  ctx.shadowBlur = 0;
  const cockpitGrad = ctx.createRadialGradient(x, y - h * 0.1, 2, x, y - h * 0.1, 10);
  cockpitGrad.addColorStop(0, 'rgba(224,231,255,0.9)');
  cockpitGrad.addColorStop(1, 'rgba(124,58,237,0.2)');
  ctx.fillStyle = cockpitGrad;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.05, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(e) {
  if (!e.alive) return;
  ctx.save();
  ctx.font = `${e.h}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Glow effect
  ctx.shadowColor = e.color;
  ctx.shadowBlur  = 14 + Math.sin(e.frame * 0.08) * 4;
  ctx.globalAlpha = 0.9;
  ctx.fillText(e.emoji, e.x, e.y);
  ctx.restore();

  // Health bar for tanky enemies
  if (e.hp > 1) {
    const maxHp = 1 + Math.floor(level / 3);
    const pct   = e.hp / maxHp;
    const bw    = e.w, bh = 4;
    const bx    = e.x - bw / 2, by = e.y - e.h / 2 - 8;
    drawRoundRect(bx, by, bw, bh, 2, '#1e293b');
    drawRoundRect(bx, by, bw * pct, bh, 2, pct > 0.5 ? '#22c55e' : '#f43f5e');
  }
}

function drawBullet(b) {
  ctx.save();
  ctx.shadowColor = b.color;
  ctx.shadowBlur  = 12;
  const grad = ctx.createLinearGradient(b.x, b.y - b.h, b.x, b.y);
  grad.addColorStop(0, b.color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  drawRoundRect(b.x - b.w / 2, b.y - b.h, b.w, b.h, b.w / 2, b.color);
  ctx.restore();
}

function drawPowerUp(p) {
  const icons = { rapid: '⚡', shield: '🛡️', bomb: '💥' };
  ctx.save();
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur  = 20;
  ctx.fillText(icons[p.type], p.x, p.y);
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawStars() {
  stars.forEach(s => {
    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawHUD() {
  // Shield bar (if player has shield)
  if (player.shield) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth   = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur  = 15;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.w * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPauseScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(2,6,23,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.font      = 'bold 3rem Orbitron, monospace';
  ctx.fillStyle = '#a855f7';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur  = 30;
  ctx.fillText('PAUSED', W / 2, H / 2 - 20);
  ctx.font      = '1rem Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.shadowBlur = 0;
  ctx.fillText('Press P to resume', W / 2, H / 2 + 25);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════════════════════
function update(dt) {
  frameCount++;

  // ── Player movement ──
  if (keys['ArrowLeft']  || keys['KeyA']) player.dx = -player.speed;
  else if (keys['ArrowRight'] || keys['KeyD']) player.dx =  player.speed;
  else player.dx = 0;
  player.x = clamp(player.x + player.dx, player.w / 2, W - player.w / 2);

  if (player.shootCooldown > 0) player.shootCooldown--;
  if (player.invincible   > 0) player.invincible--;

  // ── Player bullets ──
  bullets = bullets.filter(b => {
    b.y += b.vy;
    return b.y > -b.h;
  });

  // ── Enemy bullets ──
  eBullets = bullets.filter ? eBullets.filter(b => {
    b.y += b.vy;
    return b.y < H + b.h;
  }) : eBullets;

  // ── Enemy fire timer ──
  eBulletTimer--;
  if (eBulletTimer <= 0) {
    enemyShoot();
    eBulletTimer = Math.max(40, 100 - level * 8);
  }

  // ── Enemy movement ──
  let hitEdge = false;
  const alive = enemies.filter(e => e.alive);
  alive.forEach(e => {
    e.x += enemySpeed * enemyDir;
    e.frame++;
    if (e.x + e.w / 2 >= W - 10 || e.x - e.w / 2 <= 10) hitEdge = true;
  });

  if (hitEdge) {
    enemyDir *= -1;
    alive.forEach(e => { e.y += enemyDrop; });
    // Check if enemies reached player zone
    if (alive.some(e => e.y + e.h / 2 >= player.y - 40)) {
      triggerGameOver();
      return;
    }
  }

  // ── Bullet vs Enemy collision ──
  bullets.forEach((b, bi) => {
    enemies.forEach(e => {
      if (!e.alive) return;
      if (aabb(b, e)) {
        b.dead = true;
        e.hp--;
        if (e.hp <= 0) {
          e.alive = false;
          score += e.pts * level;
          updateScoreUI();
          spawnParticles(e.x, e.y, e.color, 18);
          spawnPowerUp(e.x, e.y);
          // Add small shake
          shakeScreen(4);
        } else {
          spawnParticles(e.x, e.y, '#ffffff', 5);
        }
      }
    });
  });
  bullets = bullets.filter(b => !b.dead);

  // ── Enemy bullet vs Player collision ──
  eBullets.forEach(b => {
    if (aabb(b, { x: player.x, y: player.y, w: player.w * 0.7, h: player.h * 0.7 })) {
      if (player.invincible > 0) return;
      if (player.shield) {
        player.shield = false;
        b.dead = true;
        spawnParticles(player.x, player.y, '#38bdf8', 12);
        return;
      }
      b.dead = true;
      lives--;
      player.invincible = 100;
      updateLivesUI();
      shakeScreen(8);
      spawnParticles(player.x, player.y, '#f43f5e', 20);
      if (lives <= 0) { triggerGameOver(); }
    }
  });
  eBullets = eBullets.filter(b => !b.dead);

  // ── Power-up movement & collection ──
  powerUps = powerUps.filter(p => {
    p.y  += p.vy;
    p.frame++;
    if (aabb(p, { x: player.x, y: player.y, w: player.w, h: player.h })) {
      applyPowerUp(p.type);
      spawnParticles(p.x, p.y, '#fbbf24', 10);
      return false;
    }
    return p.y < H + p.h;
  });

  // ── Particles ──
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.93; p.vy *= 0.93;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  // ── Star parallax ──
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  });

  // ── Level up ──
  if (enemies.filter(e => e.alive).length === 0) {
    level++;
    updateLevelUI();
    spawnWave();
    showLevelUpFlash();
  }
}

// ═══════════════════════════════════════════════════════════════
//  POWER-UPS
// ═══════════════════════════════════════════════════════════════
function applyPowerUp(type) {
  if (type === 'rapid') {
    player.shootRate = 8;
    setTimeout(() => { player.shootRate = 18; }, 5000);
  } else if (type === 'shield') {
    player.shield = true;
    setTimeout(() => { player.shield = false; }, 8000);
  } else if (type === 'bomb') {
    // Destroy all enemies in lower half
    enemies.forEach(e => {
      if (e.alive && e.y > H / 2) {
        e.alive = false;
        score += e.pts * level;
        spawnParticles(e.x, e.y, e.color, 10);
      }
    });
    updateScoreUI();
    shakeScreen(12);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SCREEN SHAKE
// ═══════════════════════════════════════════════════════════════
let shakeAmount = 0;
function shakeScreen(amount) { shakeAmount = Math.max(shakeAmount, amount); }

// ═══════════════════════════════════════════════════════════════
//  DRAW
// ═══════════════════════════════════════════════════════════════
function draw() {
  ctx.save();

  // Screen shake
  if (shakeAmount > 0.5) {
    ctx.translate(rand(-shakeAmount, shakeAmount), rand(-shakeAmount, shakeAmount));
    shakeAmount *= 0.8;
  } else { shakeAmount = 0; }

  // Background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);

  drawStars();

  // Grid overlay (subtle)
  ctx.save();
  ctx.strokeStyle = 'rgba(124,58,237,0.04)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  ctx.restore();

  // Enemies
  enemies.forEach(e => drawEnemy(e));

  // Player bullets
  bullets.forEach(b => drawBullet(b));

  // Enemy bullets
  eBullets.forEach(b => {
    ctx.save();
    ctx.shadowColor = b.color;
    ctx.shadowBlur  = 10;
    drawRoundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 2, b.color);
    ctx.restore();
  });

  // Power-ups
  powerUps.forEach(p => drawPowerUp(p));

  // Particles
  drawParticles();

  // Player
  if (state === 'playing' || state === 'paused') drawPlayer();

  // HUD overlays
  drawHUD();

  if (state === 'paused') drawPauseScreen();

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL UP FLASH
// ═══════════════════════════════════════════════════════════════
function showLevelUpFlash() {
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    font-family:Orbitron,monospace; font-size:2.5rem; font-weight:900;
    color:#fbbf24; text-shadow:0 0 30px #fbbf24; pointer-events:none;
    animation:fadeUp 1.2s ease forwards; z-index:10;
  `;
  el.textContent = `LEVEL ${level}!`;
  document.querySelector('.canvas-container').appendChild(el);
  const style = document.createElement('style');
  style.textContent = `@keyframes fadeUp { 0%{opacity:1;transform:translate(-50%,-50%)} 100%{opacity:0;transform:translate(-50%,-200%)} }`;
  document.head.appendChild(style);
  setTimeout(() => el.remove(), 1200);
}

// ═══════════════════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════════════════
function gameLoop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;

  if (state === 'playing') update(dt);
  draw();

  frameId = requestAnimationFrame(gameLoop);
}

// ═══════════════════════════════════════════════════════════════
//  UI UPDATES
// ═══════════════════════════════════════════════════════════════
function updateScoreUI() {
  document.getElementById('score-display').textContent = score.toLocaleString();
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('spaceDefenderHS', highScore);
    document.getElementById('highscore-display').textContent = highScore.toLocaleString();
  }
  // Update leaderboard row
  const lbYour = document.getElementById('lb-you');
  const lbScore = document.getElementById('lb-your-score');
  const lbLevel = document.getElementById('lb-your-level');
  if (lbYour && score > 0) {
    lbYour.style.display = 'grid';
    lbScore.textContent  = score.toLocaleString();
    lbLevel.textContent  = level;
  }
}
function updateLevelUI() {
  document.getElementById('level-display').textContent = level;
}
function updateLivesUI() {
  document.getElementById('lives-display').textContent = '❤️'.repeat(Math.max(0, lives));
}

// ═══════════════════════════════════════════════════════════════
//  GAME CONTROL
// ═══════════════════════════════════════════════════════════════
function startGame() {
  // Reset
  score = 0; lives = 3; level = 1;
  bullets = []; eBullets = []; particles = []; powerUps = [];
  player.x = W / 2; player.y = H - 70;
  player.shield = false; player.shootCooldown = 0; player.invincible = 0;
  player.shootRate = 18;
  shakeAmount = 0;

  updateScoreUI(); updateLevelUI(); updateLivesUI();
  document.getElementById('highscore-display').textContent = highScore.toLocaleString();

  spawnWave();
  hideOverlay();
  state = 'playing';

  if (frameId) cancelAnimationFrame(frameId);
  lastTime = performance.now();
  frameId  = requestAnimationFrame(gameLoop);

  // Scroll to game
  document.getElementById('game-section').scrollIntoView({ behavior: 'smooth' });
}

function togglePause() {
  if (state === 'playing') { state = 'paused'; }
  else if (state === 'paused') { state = 'playing'; lastTime = performance.now(); }
}

function restartGame() {
  if (state === 'gameover' || state === 'idle') startGame();
  else if (state === 'playing' || state === 'paused') startGame();
}

function triggerGameOver() {
  state = 'gameover';
  shakeScreen(16);
  spawnParticles(player.x, player.y, '#f43f5e', 40);

  setTimeout(() => {
    showOverlay(
      '💥', 'GAME OVER',
      `Score: ${score.toLocaleString()} &nbsp;|&nbsp; Level: ${level}`,
      'Play Again', () => startGame()
    );
  }, 800);
}

// ═══════════════════════════════════════════════════════════════
//  OVERLAY HELPERS
// ═══════════════════════════════════════════════════════════════
function showOverlay(icon, title, msg, btnText, btnAction) {
  const overlay = document.getElementById('game-overlay');
  document.getElementById('overlay-content').querySelector('.overlay-icon').textContent = icon;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-msg').innerHTML    = msg;
  const btn = document.getElementById('overlay-btn');
  btn.textContent  = btnText;
  btn.onclick      = btnAction;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  document.getElementById('game-overlay').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════
function showHowToPlay() { document.getElementById('how-modal').classList.add('open'); }
function closeModal()    { document.getElementById('how-modal').classList.remove('open'); }

// ═══════════════════════════════════════════════════════════════
//  INITIAL IDLE RENDER
// ═══════════════════════════════════════════════════════════════
function idleLoop(ts) {
  lastTime = ts;
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  stars.forEach(s => {
    s.y += s.speed * 0.5;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  });
  drawStars();
  if (state === 'idle') requestAnimationFrame(idleLoop);
}

document.getElementById('highscore-display').textContent = highScore.toLocaleString();
requestAnimationFrame(idleLoop);
