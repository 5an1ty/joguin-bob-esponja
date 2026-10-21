const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const menu = document.getElementById('menu');
const game = document.getElementById('game');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const COLS = 30;
const ROWS = 21;
const CELL = 20;
const BOARD_WIDTH = COLS * CELL;
const BOARD_HEIGHT = ROWS * CELL;

// =====================================
// ADAPTAÇÃO PARA WEB MOBILE
// =====================================

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
canvas.style.width = '100%';
canvas.style.maxWidth = `${COLS * CELL}px`;
canvas.style.height = 'auto';
canvas.style.aspectRatio = `${COLS} / ${ROWS}`;
canvas.style.display = 'block';
canvas.style.touchAction = 'none';
canvas.style.marginInline = 'auto';

// Configuração da viewport para celular
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content =
    'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';
  document.head.appendChild(viewport);
}

// Estilos responsivos
const mobileStyles = document.createElement('style');

mobileStyles.textContent = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
  }

  #game, #menu {
    width: 100%;
    max-width: 100%;
  }

  #board {
    display: block;
    width: 100%;
    max-width: 600px;
    height: auto !important;
    margin-inline: auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  [data-dir] {
    min-width: 48px;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  button {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 600px) {
    body {
      overflow-x: hidden;
    }

    #menu, #game {
      padding-left: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
    }

    #board {
      width: 100% !important;
      max-width: 600px;
    }

    [data-dir] {
      min-width: 54px;
      min-height: 54px;
      font-size: 1.15rem;
    }
  }
`;

document.head.appendChild(mobileStyles);

// =====================================
// TELA CHEIA RESPONSIVA
// =====================================

const fullscreenBtn = document.createElement('button');
fullscreenBtn.id = 'fullscreenBtn';
fullscreenBtn.type = 'button';
fullscreenBtn.textContent = '⛶ Tela cheia';
fullscreenBtn.setAttribute(
  'aria-label',
  'Ativar ou sair da tela cheia'
);

fullscreenBtn.style.cssText = [
  'display:block',
  'margin:8px auto',
  'padding:10px 14px',
  'border:0',
  'border-radius:10px',
  'font-weight:700',
  'cursor:pointer',
  'touch-action:manipulation',
  'position:relative',
  'z-index:20'
].join(';');

game.insertBefore(fullscreenBtn, game.firstChild);

const fullscreenStyles = document.createElement('style');

fullscreenStyles.textContent = `
  #game:fullscreen, #game.fallback-fullscreen {
    position: fixed !important; inset: 0 !important; z-index: 99999;
    width: 100vw !important; height: 100dvh !important; max-width: none;
    padding: 0 !important; border: 0; border-radius: 0; overflow: hidden;
    background: #064d83;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .board-wrap {
    position: absolute; border: 4px solid #51e1d2; border-radius: 14px;
    box-shadow: 0 12px 40px #00152580;
  }
  #game:is(:fullscreen, .fallback-fullscreen) #board {
    width: 100% !important; height: 100% !important; max-width: none !important;
    aspect-ratio: auto !important; margin: 0 !important;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .game-head {
    position: absolute; top: max(8px, env(safe-area-inset-top));
    left: max(8px, env(safe-area-inset-left)); z-index: 2;
    color: white; pointer-events: none; opacity: .85;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .game-head > div:first-child,
  #game:is(:fullscreen, .fallback-fullscreen) .game-footer { display: none; }
  #game:is(:fullscreen, .fallback-fullscreen) #pauseBtn { pointer-events: auto; }
  #game:is(:fullscreen, .fallback-fullscreen) #fullscreenBtn {
    position: absolute !important; top: max(8px, env(safe-area-inset-top));
    right: max(8px, env(safe-area-inset-right)); margin: 0 !important; z-index: 3 !important;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .touch-controls {
    display: flex; position: absolute; bottom: max(8px, env(safe-area-inset-bottom));
    right: max(8px, env(safe-area-inset-right)); z-index: 3; margin: 0; opacity: .8;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .touch-controls button {
    width: 48px; height: 44px; min-width: 44px; min-height: 44px;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .overlay { z-index: 5; }
  #game:is(:fullscreen, .fallback-fullscreen) .overlay-card { padding: 10px; }
  body.game-fullscreen { overflow: hidden; }
`;
document.head.appendChild(fullscreenStyles);

function isFullscreen() {
  return document.fullscreenElement === game || game.classList.contains('fallback-fullscreen');
}

async function leaveFullscreen() {
  if (document.fullscreenElement === game) await document.exitFullscreen();
  game.classList.remove('fallback-fullscreen');
  resizeBoardForViewport();
}

async function toggleFullscreen() {
  if (isFullscreen()) {
    await leaveFullscreen();
    return;
  }
  try {
    if (!game.requestFullscreen) throw new Error('Fullscreen indisponível');
    await game.requestFullscreen();
  } catch {
    game.classList.add('fallback-fullscreen');
  }
  resizeBoardForViewport();
}
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', resizeBoardForViewport);
window.addEventListener('resize', resizeBoardForViewport);
window.addEventListener('orientationchange', resizeBoardForViewport);

function resizeBoardForViewport() {
  const active = isFullscreen();
  document.body.classList.toggle('game-fullscreen', active);
  fullscreenBtn.textContent = active ? '⛶ Sair da tela cheia' : '⛶ Tela cheia';
  requestAnimationFrame(fitFullscreenBoard);
}

// =====================================
// CONTROLE POR GESTOS NO CELULAR
// =====================================

let swipeStartX = 0;
let swipeStartY = 0;
const SWIPE_THRESHOLD = 22;

canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse') return;

  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
});

canvas.addEventListener('pointerup', event => {
  if (event.pointerType === 'mouse') return;

  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;

  if (
    Math.max(Math.abs(dx), Math.abs(dy)) <
    SWIPE_THRESHOLD
  ) {
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? 'right' : 'left');
  } else {
    setDirection(dy > 0 ? 'down' : 'up');
  }
});

canvas.addEventListener('contextmenu', event => {
  event.preventDefault();
});

// Evita menu de contexto nos controles direcionais
document.querySelectorAll('[data-dir]').forEach(btn => {
  btn.addEventListener('contextmenu', event => {
    event.preventDefault();
  });
});
// =====================================
// CONFIGURAÇÕES DO JOGO
// =====================================

const settings = {
  easy: {
    label: 'Fácil',
    speed: 175,
    specialChance: 0.60,
    bossInterval: 420,
    obstacles: 7
  },

  medium: {
    label: 'Médio',
    speed: 120,
    specialChance: 0.22,
    bossInterval: 270,
    obstacles: 16
  },

  hard: {
    label: 'Difícil',
    speed: 78,
    specialChance: 0.10,
    bossInterval: 155,
    obstacles: 29
  }
};

let character = 'bob';
let difficulty = 'easy';

let snake = [];

let direction = {
  x: 1,
  y: 0
};

let nextDirection = {
  x: 1,
  y: 0
};

let food = {
  x: 15,
  y: 10
};

let obstacles = [];
let obstaclePhase = 0;
let scenePhase = 0;
let currentSpeed = 175;

let score = 0;
let timer = null;
let paused = false;
let over = false;

const foodTypes = {
  normal: {color: '#f5a62a', icon: '🍔', label: 'Clássico', duration: 0},
  ghost: {color: '#bc8cff', icon: '👻', label: 'Atravessar o corpo', duration: 8000},
  drill: {color: '#38bdf8', icon: '💎', label: 'Atravessar obstáculos', duration: 8000},
  super: {color: '#ffe45c', icon: '⚡', label: 'Imunidade + supervelocidade', duration: 6000},
  magnet: {color: '#ff77c8', icon: '🧲', label: 'Ímã de hambúrgueres', duration: 10000},
  red: {color: '#ff334e', icon: 'ϟ', label: 'Siri vermelho · raio anti-Plankton', duration: 0}
};
let gameTime = 0;
let powers = {};
let plankton = null;
let pendingPlanktons = 0;
let bossMoveTime = 0;
let beam = null;
let bossNextFood = 'normal';
let foodSerial = 0;
let previousSnake = [];
let previousFood = null;
let lastMoveAt = 0;
let motionDuration = 175;
let planktonMotion = null;
let animationFrame = null;
const powerStatus = document.getElementById('powerStatus');
const bossStatus = document.getElementById('bossStatus');

function hasPower(type) { return (powers[type] || 0) > gameTime; }

function refreshSpeed() {
  const base = Math.max(40, settings[difficulty].speed * Math.pow(0.95, scenePhase));
  const speed = hasPower('super') ? Math.max(25, base * 0.55) : base;
  if (speed !== currentSpeed) {
    currentSpeed = speed;
    clearInterval(timer);
    if (!over) timer = setInterval(tick, currentSpeed);
  }
}

function updateStatus() {
  const active = Object.keys(powers).filter(hasPower);
  const key = active.join(',');
  // Mantém os cartões no DOM durante a contagem, sem recriá-los a cada passo.
  if (powerStatus.dataset.activePowers !== key) {
    powerStatus.dataset.activePowers = key;
    powerStatus.replaceChildren();
    for (const type of active) {
      const effect = foodTypes[type];
      const badge = document.createElement('span');
      badge.className = 'effect-badge';
      badge.dataset.power = type;
      badge.style.setProperty('--effect-color', effect.color);
      const title = document.createElement('strong');
      title.textContent = `${effect.icon} ${effect.label}`;
      const remaining = document.createElement('span');
      const meter = document.createElement('progress');
      meter.max = effect.duration;
      meter.setAttribute('aria-label', `Tempo restante: ${effect.label}`);
      badge.append(title, remaining, meter);
      powerStatus.append(badge);
    }
    if (!active.length) powerStatus.textContent = 'SEM PODER ATIVO · Pegue um hambúrguer colorido';
  }
  for (const type of active) {
    const badge = powerStatus.querySelector(`[data-power="${type}"]`);
    const label = `ATIVO · ${Math.ceil((powers[type]-gameTime)/1000)}s`;
    const remaining = badge.querySelector('span');
    if (remaining.textContent !== label) remaining.textContent = label;
    badge.querySelector('progress').value = powers[type]-gameTime;
  }
  const bossLabel = plankton
    ? `👁 Plankton ${plankton.hits}/3 raios${plankton.stunnedUntil > gameTime ? ' · PARALISADO' : ' · PERSEGUINDO!'} · Próximo: ${bossNextFood === 'red' ? 'VERMELHO ϟ' : 'NORMAL 🍔'}`
    : 'Bordas livres ↔ ↕';
  if (bossStatus.textContent !== bossLabel) bossStatus.textContent = bossLabel;
}

function chooseFoodType(roll = Math.random(), powerRoll = Math.random()) {
  if (plankton) return bossNextFood;
  if (roll >= settings[difficulty].specialChance) return 'normal';
  return ['ghost', 'drill', 'super', 'magnet'][Math.floor(powerRoll * 4)];
}

function spawnPlankton() {
  if (plankton || !pendingPlanktons) return;
  const head = snake[0];
  const cells = [];
  for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++) {
    const p = {x,y};
    if (torusDistance(head,p) >= 8 && !snake.some(s=>same(s,p)) &&
        !obstacles.some(o=>same(o,p)) && !(food && same(food,p))) cells.push(p);
  }
  if (!cells.length) return;
  plankton = {...cells[Math.floor(Math.random()*cells.length)], hits: 0, stunnedUntil: 0};
  pendingPlanktons--;
  bossNextFood = 'normal';
  planktonMotion = null;
  bossMoveTime = gameTime + settings[difficulty].bossInterval;
}

function addScore(amount) {
  const previous = score;
  score += amount;
  scoreEl.textContent = score;
  if (score > best) {
    best = score; bestEl.textContent = best;
    localStorage.setItem('bobSnakeBest', best);
  }
  const phase = Math.floor(score / 30);
  if (phase > obstaclePhase) {
    obstaclePhase = phase;
    generateObstacles(settings[difficulty].obstacles);
  }
  scenePhase = Math.floor(score / 100);
  pendingPlanktons += Math.floor(score/200)-Math.floor(previous/200);
  spawnPlankton();
  refreshSpeed();
}

function collectFood() {
  const type = food.type || 'normal';
  if (plankton) bossNextFood = type === 'normal' ? 'red' : 'normal';
  if (foodTypes[type].duration) powers[type] = gameTime + foodTypes[type].duration;
  if (type === 'red' && plankton) {
    beam = {from: {...snake[0]}, to: {...plankton}, until: gameTime + 400};
    plankton.hits++;
    plankton.stunnedUntil = gameTime + 3000;
    if (plankton.hits >= 3) {
      plankton = null;
      addScore(50);
    }
  }
  addScore(10);
  return placeFood();
}

function moveMagnet() {
  if (!food || !hasPower('magnet')) return;
  const head = snake[0];
  const moves = steps.map(d => wrap({x:food.x+d.x, y:food.y+d.y}))
    .filter(p => torusDistance(p,head) < torusDistance(food,head) &&
      !snake.slice(1).some(s=>same(s,p)));
  if (moves.length) Object.assign(food, moves[Math.floor(Math.random()*moves.length)]);
}

function updatePlankton() {
  if (!plankton || plankton.stunnedUntil > gameTime) return;
  if (same(plankton,snake[0]) && !hasPower('super')) { endGame(); return; }
  if (gameTime >= bossMoveTime) {
    const head = snake[0];
    const moves = steps.map(d=>wrap({x:plankton.x+d.x,y:plankton.y+d.y}));
    moves.sort((a,b)=>torusDistance(a,head)-torusDistance(b,head));
    planktonMotion = {from: {...plankton}, startedAt: performance.now(), duration: settings[difficulty].bossInterval};
    Object.assign(plankton,moves[0]);
    bossMoveTime = gameTime + settings[difficulty].bossInterval;
  }
  if (same(plankton,snake[0]) && !hasPower('super')) endGame();
}


let best = Number(
  localStorage.getItem('bobSnakeBest') || 0
);

// =====================================
// MÚSICAS
// =====================================

const musicas = {
  easy: new Audio('musicas/facil.mp3'),
  medium: new Audio('musicas/medio-dificil.mp3'),
  hard: new Audio('musicas/medio-dificil.mp3')
};

Object.values(musicas).forEach(musica => {
  musica.loop = true;
  musica.volume = 0.35;
});

let musicaAtual = null;

function tocarMusica() {
  const musicaSelecionada = musicas[difficulty];

  if (
    musicaAtual === musicaSelecionada &&
    !musicaAtual.paused
  ) {
    return;
  }

  pararMusica();

  musicaAtual = musicaSelecionada;
  musicaAtual.currentTime = 0;

  musicaAtual.play().catch(erro => {
    console.log(
      'Não foi possível iniciar a música:',
      erro
    );
  });
}

function pararMusica() {
  Object.values(musicas).forEach(musica => {
    musica.pause();
    musica.currentTime = 0;
  });

  musicaAtual = null;
}

// =====================================
// RECORDE
// =====================================

bestEl.textContent = best;

// =====================================
// SELEÇÃO DE PERSONAGEM
// =====================================

document.querySelectorAll('.character').forEach(btn => {
  btn.addEventListener('click', () => {
    character = btn.dataset.character;

    document.querySelectorAll('.character').forEach(b => {
      const selected = b === btn;

      b.classList.toggle('selected', selected);
      b.setAttribute('aria-pressed', selected);
    });
  });
});

// =====================================
// SELEÇÃO DE DIFICULDADE
// =====================================

document.querySelectorAll('.difficulty').forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.difficulty;

    document.querySelectorAll('.difficulty').forEach(b => {
      const selected = b === btn;

      b.classList.toggle('selected', selected);
      b.setAttribute('aria-pressed', selected);
    });
  });
});

// =====================================
// INSTRUÇÕES
// =====================================

document.getElementById('howBtn').addEventListener('click', () => {
  const hidden = document.getElementById('howText').classList.toggle('hidden');
  document.getElementById('howBtn').setAttribute('aria-expanded', String(!hidden));
});

// =====================================
// BOTÕES DO JOGO
// =====================================

document.getElementById('startBtn')
  .addEventListener('click', startGame);

document.getElementById('pauseBtn')
  .addEventListener('click', togglePause);

document.getElementById('resumeBtn')
  .addEventListener('click', togglePause);

document.getElementById('restartBtn')
  .addEventListener('click', startGame);

document.getElementById('menuBtn')
  .addEventListener('click', goMenu);

// =====================================
// INICIAR OU REINICIAR O JOGO
// =====================================

function startGame() {
  clearInterval(timer);

  menu.classList.add('hidden');
  game.classList.remove('hidden');

  score = 0;
  gameTime = 0;
  powers = {};
  plankton = null;
  pendingPlanktons = 0;
  beam = null;
  bossNextFood = 'normal';
  planktonMotion = null;
  foodSerial = 0;
  food = null;
  paused = false;
  over = false;

  direction = {
    x: 1,
    y: 0
  };

  nextDirection = {
    x: 1,
    y: 0
  };

  snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 }
  ];

  obstacles = [];
  obstaclePhase = 0;
  scenePhase = 0;
  currentSpeed = settings[difficulty].speed;

  const count = settings[difficulty].obstacles;
  generateObstacles(count);

  if (!placeFood()) return;

  scoreEl.textContent = score;

  document.getElementById('playingAs').textContent =
    character === 'bob'
      ? '🧽 Bob Esponja'
      : '⭐ Patrick';

  document.getElementById('level').textContent =
    settings[difficulty].label;

  overlay.classList.add('hidden');

  document.getElementById('pauseBtn').textContent = 'II';

  previousSnake = snake.map(p => ({...p}));
  previousFood = food && {...food};
  lastMoveAt = performance.now();
  motionDuration = currentSpeed;
  updateStatus();
  resizeBoardForViewport();
  startAnimation();
  tocarMusica();

  timer = setInterval(
    tick,
    currentSpeed
  );
}

// =====================================
// VERIFICAR POSIÇÕES
// =====================================

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

// Gera obstáculos sem ocupar a cobra, a comida, o Plankton
// ou o espaço logo à frente dela, inclusive ao atravessar as bordas.
function generateObstacles(count) {
  const generated = [];
  const head = snake[0];
  const safeAheadDistance = 8;
  let tries = 0;
  const maxTries = COLS * ROWS * 30;

  while (generated.length < count && tries < maxTries) {
    tries++;

    const p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };

    const onSnake = snake.some(s => same(s, p));
    const onFood = food && same(food, p);
    const onExisting = generated.some(
      obstacle => same(obstacle, p)
    );

    // Mantém livre a região à frente da cabeça,
    // considerando a direção atual da cobra.
    let tooCloseAhead = false;

    for (let distance = 1;
         distance <= safeAheadDistance;
         distance++) {
      const safePosition = {
        x: (head.x + direction.x * distance + COLS) % COLS,
        y: (head.y + direction.y * distance + ROWS) % ROWS
      };

      if (
        safePosition.x >= 0 &&
        safePosition.x < COLS &&
        safePosition.y >= 0 &&
        safePosition.y < ROWS &&
        same(safePosition, p)
      ) {
        tooCloseAhead = true;
        break;
      }
    }

    // Também evita obstáculos muito próximos da cabeça,
    // independentemente da direção.
    const closeToHead =
      Math.abs(p.x - head.x) <= 2 &&
      Math.abs(p.y - head.y) <= 2;

    if (
      !(plankton && same(plankton,p)) &&
      !onSnake &&
      !onFood &&
      !onExisting &&
      !tooCloseAhead &&
      !closeToHead &&
      !obstacles.some(o => same(o, p)) &&
      connectedArena([...generated, p])
    ) {
      generated.push(p);
    }
  }

  obstacles = generated;
}
// =====================================
// POSICIONAR O HAMBÚRGUER
// =====================================

const steps = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
const cellKey = p => p.y * COLS + p.x;
const wrap = p => ({x: (p.x + COLS) % COLS, y: (p.y + ROWS) % ROWS});
const torusDistance = (a,b) => {
  const dx = Math.abs(a.x-b.x), dy = Math.abs(a.y-b.y);
  return Math.min(dx,COLS-dx) + Math.min(dy,ROWS-dy);
};

// Não permite ilhas ou becos sem saída criados pelas pedras.
function connectedArena(rocks) {
  const blocked = new Set(rocks.map(cellKey));
  const seen = new Set([cellKey(snake[0])]);
  const queue = [snake[0]];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    const neighbors = steps.map(d => wrap({x: cell.x+d.x, y: cell.y+d.y}))
      .filter(p => !blocked.has(cellKey(p)));
    if (neighbors.length < 2) return false;
    for (const p of neighbors) if (!seen.has(cellKey(p))) {
      seen.add(cellKey(p)); queue.push(p);
    }
  }
  return seen.size === COLS * ROWS - rocks.length;
}

function placeFood() {
  // Cada candidato possui um caminho sem atravessar o corpo e espaço para
  // continuar depois de comer. A simulação inclui o crescimento da cobra.
  const blocked = new Set([...obstacles, ...snake.slice(1), ...(plankton ? [plankton] : [])].map(cellKey));
  const parents = new Map([[cellKey(snake[0]), null]]);
  const queue = [snake[0]];
  for (let i = 0; i < queue.length; i++) {
    for (const d of steps) {
      if (i === 0 && d.x === -direction.x && d.y === -direction.y) continue;
      const p = wrap({x: queue[i].x+d.x, y: queue[i].y+d.y});
      const key = cellKey(p);
      if (blocked.has(key) || parents.has(key)) continue;
      parents.set(key, queue[i]); queue.push(p);
    }
  }
  const candidates = queue.slice(1);
  while (candidates.length) {
    const index = Math.floor(Math.random()*candidates.length);
    const candidate = candidates.splice(index, 1)[0];
    const path = [];
    for (let p = candidate; parents.get(cellKey(p)); p = parents.get(cellKey(p))) path.push(p);
    const body = snake.map(p => ({...p}));
    for (const p of path.reverse()) {
      body.unshift(p);
      if (!same(p, candidate)) body.pop();
    }
    const occupied = new Set([...obstacles, ...body.slice(1, -1), ...(plankton ? [plankton] : [])].map(cellKey));
    const escape = steps.some(d => {
      const p = wrap({x:candidate.x+d.x, y:candidate.y+d.y});
      return !occupied.has(cellKey(p));
    });
    if (escape) {
      food = {...candidate, id: ++foodSerial, type: chooseFoodType()};
      return true;
    }
  }
  food = null;
  endGame();
  document.getElementById('overlayTitle').textContent = 'Tabuleiro concluído!';
  document.getElementById('overlayText').textContent = 'Não há espaço seguro para outro hambúrguer.';
  return false;
}

// =====================================
// ATUALIZAR MOVIMENTAÇÃO DA COBRA
// =====================================

function tick() {
  if (paused || over) return;
  previousSnake = snake.map(p => ({...p}));
  previousFood = food && {...food};
  lastMoveAt = performance.now();
  motionDuration = currentSpeed;
  gameTime += currentSpeed;
  refreshSpeed();
  if (padDirection) setDirection(padDirection);
  direction = nextDirection;
  moveMagnet();
  const head = wrap({x: snake[0].x + direction.x, y: snake[0].y + direction.y});
  // O ímã pode entregar a comida na posição atual da cabeça.
  const eating = food && (same(head, food) || same(snake[0], food));
  const hitObstacle = obstacles.some(o => same(o,head));
  const body = eating ? snake : snake.slice(0,-1);
  const hitSelf = body.some(s=>same(s,head));
  if ((hitObstacle && !hasPower('drill') && !hasPower('super')) ||
      (hitSelf && !hasPower('ghost') && !hasPower('super'))) {
    endGame(); return;
  }
  snake.unshift(head);
  if (eating) {
    if (!collectFood()) { draw(); return; }
  } else snake.pop();
  spawnPlankton();
  updatePlankton();
  updateStatus();
}

// =====================================
// CONTROLAR A DIREÇÃO
// =====================================

function setDirection(dir) {
  if (
    paused ||
    over ||
    !menu.classList.contains('hidden')
  ) {
    return;
  }

  const dirs = {
    up: {
      x: 0,
      y: -1
    },

    down: {
      x: 0,
      y: 1
    },

    left: {
      x: -1,
      y: 0
    },

    right: {
      x: 1,
      y: 0
    }
  };

  const d = dirs[dir];

  // Impedir que a cobra inverta a direção
  if (
    d &&
    !(d.x === -direction.x && d.y === -direction.y)
  ) {
    nextDirection = d;
  }
}

// =====================================
// CONTROLES DE TECLADO
// =====================================

document.addEventListener('keydown', e => {
  const map = {
    ArrowUp: 'up',
    w: 'up',
    W: 'up',

    ArrowDown: 'down',
    s: 'down',
    S: 'down',

    ArrowLeft: 'left',
    a: 'left',
    A: 'left',

    ArrowRight: 'right',
    d: 'right',
    D: 'right'
  };

  if (map[e.key]) {
    e.preventDefault();
    setDirection(map[e.key]);
  }

  if (
    e.key === 'Escape' &&
    !game.classList.contains('hidden')
  ) {
    togglePause();
  }
});

// =====================================
// CONTROLES DIRECIONAIS MOBILE
// =====================================

const directionPad = document.querySelector('.touch-controls');
let padPointer = null;
let padDirection = null;

function clearPadPointer(event) {
  if (event && event.pointerId !== padPointer) return;
  padPointer = null;
  padDirection = null;
  directionPad.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed'));
}

function steerFromPointer(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-dir]');
  const button = hit && directionPad.contains(hit) ? hit : null;
  directionPad.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed'));
  if (!button) { padDirection = null; return; }
  button.classList.add('pressed');
  padDirection = button.dataset.dir;
  setDirection(padDirection);
}

directionPad.addEventListener('pointerdown', event => {
  if (padPointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  padPointer = event.pointerId;
  // A captura mantém o gesto mesmo no espaço central e fora dos botões.
  directionPad.setPointerCapture(event.pointerId);
  steerFromPointer(event);
});
directionPad.addEventListener('pointermove', event => {
  if (event.pointerId !== padPointer) return;
  event.preventDefault();
  steerFromPointer(event);
});
directionPad.addEventListener('pointerup', clearPadPointer);
directionPad.addEventListener('pointercancel', clearPadPointer);
directionPad.addEventListener('lostpointercapture', clearPadPointer);
window.addEventListener('blur', () => clearPadPointer());

// =====================================
// PAUSAR E CONTINUAR
// =====================================

function togglePause() {
  if (over) return;

  clearPadPointer();
  paused = !paused;

  overlay.classList.toggle('hidden', !paused);

  document.getElementById('overlayIcon').textContent = '⏸️';

  document.getElementById('overlayTitle').textContent =
    'Jogo pausado';

  if (paused) {
    if (musicaAtual) musicaAtual.pause();
  } else {
    tocarMusica();
  }

  document.getElementById('overlayText').textContent =
    'Respire fundo, mergulhador!';

  document.getElementById('resumeBtn')
    .classList.remove('hidden');

  document.getElementById('restartBtn').textContent =
    'RECOMEÇAR';

  document.getElementById('pauseBtn').textContent =
    paused ? '▶' : 'II';
}
// =====================================
// FIM DE JOGO
// =====================================

function endGame() {
  over = true;
  clearPadPointer();

  clearInterval(timer);

  overlay.classList.remove('hidden');

  document.getElementById('overlayIcon').textContent = '💥';

  document.getElementById('overlayTitle').textContent =
    'Fim de jogo!';

  document.getElementById('overlayText').textContent =
    `Você fez ${score} pontos. Tente mais uma vez!`;

  document.getElementById('resumeBtn')
    .classList.add('hidden');

  document.getElementById('restartBtn').textContent =
    'JOGAR NOVAMENTE';

  pararMusica();

  document.getElementById('pauseBtn').textContent = '↻';
}

// =====================================
// VOLTAR AO MENU
// =====================================

function goMenu() {
  clearPadPointer();
  cancelAnimationFrame(animationFrame);
  clearInterval(timer);
  if (isFullscreen()) leaveFullscreen();

  overlay.classList.add('hidden');
  game.classList.add('hidden');
  menu.classList.remove('hidden');

  pararMusica();
}

// O canvas acompanha os pixels físicos da tela; a grade mantém células quadradas.
function syncCanvasResolution() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
  }
  ctx.setTransform(width / BOARD_WIDTH, 0, 0, height / BOARD_HEIGHT, 0, 0);
  ctx.imageSmoothingEnabled = true;
  draw();
}

function fitFullscreenBoard() {
  if (!isFullscreen()) { syncCanvasResolution(); return; }
  const bounds = game.getBoundingClientRect();
  const pad = directionPad.getBoundingClientRect();
  const status = document.querySelector('.status-bar').getBoundingClientRect();
  const header = document.querySelector('.game-head').getBoundingClientRect();
  const sidePad = pad.width > 0 && bounds.width > bounds.height && bounds.height <= 500;
  const top = Math.max(header.bottom-bounds.top+12, sidePad ? 72 : status.bottom-bounds.top+12);
  const availableWidth = bounds.width - (sidePad ? pad.width+52 : 28);
  const bottom = pad.height && !sidePad ? pad.top-bounds.top-18 : bounds.height-18;
  const availableHeight = Math.max(80,bottom-top);
  const frame = document.querySelector('.board-wrap');
  const style = getComputedStyle(frame);
  const borderX = parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
  const borderY = parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
  const width = Math.min(availableWidth, (availableHeight-borderY)*COLS/ROWS+borderX);
  const height = (width-borderX)*ROWS/COLS+borderY;
  game.style.setProperty('--map-width',`${width}px`);
  game.style.setProperty('--map-height',`${height}px`);
  game.style.setProperty('--map-left',`${14+(availableWidth-width)/2}px`);
  game.style.setProperty('--map-top',`${top+(availableHeight-height)/2}px`);
  syncCanvasResolution();
}

function interpolateCell(from, to, alpha) {
  const dx = ((to.x-from.x+COLS*1.5)%COLS)-COLS/2;
  const dy = ((to.y-from.y+ROWS*1.5)%ROWS)-ROWS/2;
  return {x:(from.x+dx*alpha+COLS)%COLS,y:(from.y+dy*alpha+ROWS)%ROWS};
}

function paintWrapped(cell, paint) {
  const xs = [cell.x*CELL], ys = [cell.y*CELL];
  if(cell.x>COLS-1) xs.push((cell.x-COLS)*CELL);
  if(cell.y>ROWS-1) ys.push((cell.y-ROWS)*CELL);
  for(const x of xs) for(const y of ys) paint(x,y);
}

function applyCharacterEffect() {
  // Troca visual solicitada: passagem por obstáculos fica translúcida.
  if(hasPower('drill')) ctx.globalAlpha = .55;
  if(hasPower('ghost')) {ctx.shadowColor = '#bc8cff';ctx.shadowBlur = 7;}
  if(hasPower('super')) {ctx.shadowColor = '#ffe45c';ctx.shadowBlur = 12;}
}

function startAnimation() {
  cancelAnimationFrame(animationFrame);
  const render = now => {
    if(game.classList.contains('hidden')) return;
    const alpha = paused || over ? 1 : Math.min(1,Math.max(0,(now-lastMoveAt)/motionDuration));
    draw(alpha,now);
    if(!over) animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

// =====================================
// DESENHAR O CENÁRIO
// =====================================

function draw(alpha = 1, now = performance.now()) {
  ctx.clearRect(
    0,
    0,
    BOARD_WIDTH,
    BOARD_HEIGHT
  );

  // Fundo submarino
  const grad = ctx.createLinearGradient(
    0,
    0,
    0,
    BOARD_HEIGHT
  );

  const sceneHue = (200 + scenePhase * 47) % 360;
  grad.addColorStop(0, `hsl(${sceneHue}, 85%, 36%)`);
  grad.addColorStop(1, `hsl(${(sceneHue + 18) % 360}, 85%, 20%)`);

  ctx.fillStyle = grad;

  ctx.fillRect(
    0,
    0,
    BOARD_WIDTH,
    BOARD_HEIGHT
  );

  // Grade do tabuleiro
  ctx.strokeStyle = 'rgba(165,237,244,.08)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, BOARD_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(BOARD_WIDTH, y * CELL);
    ctx.stroke();
  }

  // Bolhas no fundo
  for (let i = 0; i < 13; i++) {
    const x = (i * 83 + 31) % BOARD_WIDTH;
    const visualTime = gameTime + ((!paused && !over) ? alpha * motionDuration : 0);
    const y = (i * 47 + 22 - visualTime / 150 + BOARD_HEIGHT * 100) % BOARD_HEIGHT;

    ctx.strokeStyle = 'rgba(194,248,255,.22)';

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      3 + (i % 3) * 2,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }

  drawSeaDecorations();

  // Obstáculos
  obstacles.forEach((o, i) => {
    const kind = (i + scenePhase) % 4;
    if (kind === 0) drawRock(o.x * CELL, o.y * CELL, i);
    else drawHouse(o.x * CELL, o.y * CELL, kind);
  });

  // Hambúrguer
  if (food) {
    const from = previousFood?.id === food.id ? previousFood : food;
    paintWrapped(interpolateCell(from, food, alpha), (x,y) => {
      ctx.save(); drawFood(x,y); ctx.restore();
    });
  }

  drawPlankton(now);

  // Interpolação contínua entre passos; a lógica de colisão continua na grade.
  const positions = snake.map((cell,i) => interpolateCell(previousSnake[i] || cell,cell,alpha));
  ctx.save();
  applyCharacterEffect();
  ctx.strokeStyle = character === 'bob' ? '#ffd92e' : '#ff829b';
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for(let i=1;i<positions.length;i++) {
    const a=positions[i-1], b=positions[i];
    if(Math.abs(a.x-b.x)>1.1 || Math.abs(a.y-b.y)>1.1) continue;
    ctx.beginPath();ctx.moveTo(a.x*CELL+10,a.y*CELL+10);ctx.lineTo(b.x*CELL+10,b.y*CELL+10);ctx.stroke();
  }
  ctx.restore();
  positions.forEach((cell,i) => paintWrapped(cell, (x,y) => {
    ctx.save(); applyCharacterEffect(); drawSnake(x,y,i); ctx.restore();
  }));
}

// =====================================
// DESENHAR PEDRAS
// =====================================

function drawRock(x, y, i) {
  // A cor fica mais vibrante a cada mudança de obstáculos.
  const hue = (210 + obstaclePhase * 67) % 360;
  const saturation = Math.min(100, 20 + obstaclePhase * 12);
  ctx.fillStyle = `hsl(${hue}, ${saturation}%, 22%)`;

  roundRect(x + 2, y + 3, 16, 15, 5);
  ctx.fill();

  ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${48 + i % 2 * 8}%)`;

  roundRect(x + 2, y + 1, 16, 15, 5);
  ctx.fill();

  ctx.fillStyle = `hsl(${hue}, ${saturation}%, 80%)`;

  ctx.beginPath();
  ctx.arc(x + 7, y + 5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `hsl(${hue}, ${saturation}%, 30%)`;

  ctx.beginPath();
  ctx.moveTo(x + 5, y + 12);
  ctx.lineTo(x + 10, y + 9);
  ctx.lineTo(x + 14, y + 12);
  ctx.stroke();
}

// =====================================
// DESENHAR HAMBÚRGUER
// =====================================

function drawFood(x, y) {
  ctx.fillStyle = '#4c301a';

  roundRect(x + 3, y + 5, 14, 10, 4);
  ctx.fill();

  const type = foodTypes[food?.type || 'normal'];
  ctx.shadowColor = type.color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = type.color;

  roundRect(x + 3, y + 4, 14, 5, 3);
  ctx.fill();

  ctx.fillStyle = '#68c84c';
  ctx.fillRect(x + 4, y + 7, 12, 2);

  ctx.fillStyle = '#e94e36';

  roundRect(x + 4, y + 8, 12, 3, 2);
  ctx.fill();

  ctx.fillStyle = type.color;

  roundRect(x + 3, y + 12, 14, 4, 2);
  ctx.fill();

  ctx.fillStyle = '#fff2b4';

  ctx.beginPath();
  ctx.arc(x + 7, y + 5, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (food?.type !== 'normal') {
    ctx.fillStyle = '#112c49'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText({ghost:'G', drill:'O', super:'⚡', magnet:'M', red:'ϟ'}[food.type] || '', x+10, y+12);
  }
}
function drawSeaDecorations() {
  ctx.save();
  // Flores marinhas da Fenda do Biquíni, ao fundo, sem colisão.
  ctx.strokeStyle = 'rgba(135,245,224,.18)'; ctx.lineWidth = 3;
  for (let i=0;i<5;i++) {
    const x=(i*137+scenePhase*29+50)%BOARD_WIDTH;
    const y=(i*89+40)%BOARD_HEIGHT;
    for(let petal=0;petal<5;petal++) {
      const angle=petal*Math.PI*2/5;
      ctx.beginPath(); ctx.ellipse(x+Math.cos(angle)*14,y+Math.sin(angle)*14,12,6,angle,0,Math.PI*2); ctx.stroke();
    }
  }
  ctx.globalAlpha=.32; ctx.font='18px sans-serif';
  for(let i=0;i<8;i++) ctx.fillText(['🪸','🐚','🪼'][i%3],(i*79+scenePhase*17)%580,400-(i%3)*13);
  ctx.restore();
}

function drawHouse(x,y,kind) {
  ctx.save();
  ctx.translate(x,y);
  ctx.strokeStyle = `hsl(${(obstaclePhase*67+40)%360}, 95%, 72%)`;
  ctx.lineWidth=1;
  if(kind===1) { // Abacaxi do Bob
    ctx.fillStyle='#ef9e20'; roundRect(3,6,14,14,5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#a95e14';
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(4+i*4,7);ctx.lineTo(9+i*4,18);ctx.stroke();}
    ctx.fillStyle='#54d557'; ctx.beginPath();ctx.moveTo(10,7);ctx.lineTo(3,1);ctx.lineTo(9,3);ctx.lineTo(11,0);ctx.lineTo(13,4);ctx.lineTo(18,2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#69e4ff';ctx.fillRect(5,10,3,3);ctx.fillRect(11,15,3,5);
  } else if(kind===2) { // Moai do Lula Molusco
    ctx.fillStyle='#66899a';roundRect(4,1,12,19,3);ctx.fill();ctx.stroke();
    ctx.fillStyle='#233f55';ctx.fillRect(5,6,4,3);ctx.fillRect(12,6,3,3);ctx.fillRect(8,15,5,5);
    ctx.fillStyle='#93b6bd';ctx.fillRect(8,8,4,5);
  } else { // Rocha/casa do Patrick
    ctx.fillStyle='#a86e5c';ctx.beginPath();ctx.arc(10,17,9,Math.PI,0);ctx.lineTo(19,20);ctx.lineTo(1,20);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#e4b578';ctx.fillRect(9,4,2,5);ctx.fillRect(6,3,8,2);
  }
  ctx.restore();
}

function drawPlankton(now = performance.now()) {
  if(beam && beam.until>gameTime) {
    ctx.save();ctx.strokeStyle='#ff4560';ctx.lineWidth=4;ctx.shadowColor='#fff';ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(beam.from.x*CELL+10,beam.from.y*CELL+10);ctx.lineTo(beam.to.x*CELL+10,beam.to.y*CELL+10);ctx.stroke();ctx.restore();
  }
  if(!plankton) return;
  const motion = planktonMotion;
  const alpha = !paused && !over && motion ? Math.min(1,(now-motion.startedAt)/motion.duration) : 1;
  const position = interpolateCell(motion?.from || plankton,plankton,alpha);
  paintWrapped(position, (x,y) => {
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle=plankton.stunnedUntil>gameTime?'#66e6ff':'#80c22f';
  roundRect(4,3,12,16,5);ctx.fill();
  ctx.strokeStyle='#224e24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,4);ctx.lineTo(2,0);ctx.moveTo(14,4);ctx.lineTo(18,0);ctx.stroke();
  ctx.fillStyle='#fff4a3';ctx.beginPath();ctx.ellipse(10,9,5,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e33d38';ctx.beginPath();ctx.arc(10,9,2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#203320';ctx.fillRect(7,15,6,2);
  ctx.restore();
  });
}

// =====================================
// DESENHAR A COBRA
// =====================================

function drawSnake(x, y, i) {
  const head = i === 0;

  if (character === 'bob') {
    // Corpo amarelo do Bob Esponja
    ctx.fillStyle = head ? '#d49b16' : '#a97b10';

    roundRect(x + 2, y + 2, 16, 16, 4);
    ctx.fill();

    ctx.fillStyle = head ? '#ffe34a' : '#ffd92e';

    roundRect(x + 2, y + 1, 16, 15, 4);
    ctx.fill();

    if (head) {
      // Olhos
      ctx.fillStyle = '#fff';

      ctx.beginPath();
      ctx.arc(x + 7, y + 7, 3.3, 0, Math.PI * 2);
      ctx.arc(x + 14, y + 7, 3.3, 0, Math.PI * 2);
      ctx.fill();

      // Íris
      ctx.fillStyle = '#1476bd';

      ctx.beginPath();
      ctx.arc(x + 7.5, y + 7, 1.7, 0, Math.PI * 2);
      ctx.arc(x + 13.5, y + 7, 1.7, 0, Math.PI * 2);
      ctx.fill();

      // Pupilas
      ctx.fillStyle = '#17344a';

      ctx.beginPath();
      ctx.arc(x + 7.5, y + 7, 0.8, 0, Math.PI * 2);
      ctx.arc(x + 13.5, y + 7, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Sorriso
      ctx.strokeStyle = '#9b4d22';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 8, y + 11, 2, 2);
      ctx.fillRect(x + 11, y + 11, 2, 2);
    } else {
      ctx.fillStyle = '#fff39b';

      ctx.beginPath();
      ctx.arc(x + 7, y + 6, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Corpo rosa do Patrick
    ctx.fillStyle = head ? '#b64d70' : '#e97591';

    ctx.beginPath();
    ctx.moveTo(x + 10, y + 1);
    ctx.lineTo(x + 19, y + 17);
    ctx.lineTo(x + 1, y + 17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = head ? '#ff9caf' : '#ff829b';

    ctx.beginPath();
    ctx.moveTo(x + 10, y + 2);
    ctx.lineTo(x + 17, y + 16);
    ctx.lineTo(x + 3, y + 16);
    ctx.closePath();
    ctx.fill();

    if (head) {
      // Olhos do Patrick
      ctx.fillStyle = '#fff';

      ctx.beginPath();
      ctx.arc(x + 7, y + 9, 3, 0, Math.PI * 2);
      ctx.arc(x + 13, y + 9, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#192e48';

      ctx.beginPath();
      ctx.arc(x + 8, y + 9, 1.2, 0, Math.PI * 2);
      ctx.arc(x + 12, y + 9, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Sorriso
      ctx.strokeStyle = '#9d3e5c';

      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 3, 0, Math.PI);
      ctx.stroke();
    }
  }
}

// =====================================
// DESENHAR RETÂNGULOS ARREDONDADOS
// =====================================

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// =====================================
// DESENHAR TABULEIRO INICIAL
// =====================================

const layoutObserver = new ResizeObserver(fitFullscreenBoard);
layoutObserver.observe(game);
layoutObserver.observe(document.querySelector('.status-bar'));
layoutObserver.observe(directionPad);
const canvasObserver = new ResizeObserver(syncCanvasResolution);
canvasObserver.observe(canvas);
resizeBoardForViewport();
syncCanvasResolution();