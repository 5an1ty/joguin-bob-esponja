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
    position: absolute; inset: 0; border: 0; border-radius: 0; box-shadow: none;
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
  #game.rotated-fullscreen {
    inset: auto !important; top: 0 !important; left: 100vw !important;
    width: 100dvh !important; height: 100vw !important;
    transform: rotate(90deg); transform-origin: top left;
  }
  #game:is(:fullscreen, .fallback-fullscreen) .overlay-card { padding: 10px; }
  body.game-fullscreen { overflow: hidden; }
`;
document.head.appendChild(fullscreenStyles);

function isFullscreen() {
  return document.fullscreenElement === game || game.classList.contains('fallback-fullscreen');
}

async function leaveFullscreen() {
  if (document.fullscreenElement === game) await document.exitFullscreen();
  game.classList.remove('fallback-fullscreen', 'rotated-fullscreen');
  if (screen.orientation?.unlock) screen.orientation.unlock();
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
  try {
    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
  } catch {
    // Quando o navegador recusa o bloqueio, o layout gira dentro da página.
  }
  resizeBoardForViewport();
}
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', resizeBoardForViewport);
window.addEventListener('resize', resizeBoardForViewport);
window.addEventListener('orientationchange', resizeBoardForViewport);

function resizeBoardForViewport() {
  const active = isFullscreen();
  game.classList.toggle('rotated-fullscreen', active && window.innerHeight > window.innerWidth);
  document.body.classList.toggle('game-fullscreen', active);
  fullscreenBtn.textContent = active ? '⛶ Sair da tela cheia' : '⛶ Tela cheia';
  if (!active && screen.orientation?.unlock) screen.orientation.unlock();
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

  const rotated = game.classList.contains('rotated-fullscreen');
  const dx = rotated ? event.clientY - swipeStartY : event.clientX - swipeStartX;
  const dy = rotated ? swipeStartX - event.clientX : event.clientY - swipeStartY;

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
    obstacles: 7
  },

  medium: {
    label: 'Médio',
    speed: 120,
    obstacles: 16
  },

  hard: {
    label: 'Difícil',
    speed: 78,
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
  document.getElementById('howText')
    .classList.toggle('hidden');
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

  document.getElementById('pauseBtn').textContent = 'Ⅱ';

  draw();
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

// Gera obstáculos sem ocupar a cobra, a comida
// ou o espaço logo à frente dela.
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
        x: head.x + direction.x * distance,
        y: head.y + direction.y * distance
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
const inside = p => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS;

// Não permite ilhas ou becos sem saída criados pelas pedras.
function connectedArena(rocks) {
  const blocked = new Set(rocks.map(cellKey));
  const seen = new Set([cellKey(snake[0])]);
  const queue = [snake[0]];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    const neighbors = steps.map(d => ({x: cell.x+d.x, y: cell.y+d.y}))
      .filter(p => inside(p) && !blocked.has(cellKey(p)));
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
  const blocked = new Set([...obstacles, ...snake.slice(1)].map(cellKey));
  const parents = new Map([[cellKey(snake[0]), null]]);
  const queue = [snake[0]];
  for (let i = 0; i < queue.length; i++) {
    for (const d of steps) {
      if (i === 0 && d.x === -direction.x && d.y === -direction.y) continue;
      const p = {x: queue[i].x+d.x, y: queue[i].y+d.y};
      const key = cellKey(p);
      if (!inside(p) || blocked.has(key) || parents.has(key)) continue;
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
    const occupied = new Set([...obstacles, ...body.slice(1, -1)].map(cellKey));
    const escape = steps.some(d => {
      const p = {x:candidate.x+d.x, y:candidate.y+d.y};
      return inside(p) && !occupied.has(cellKey(p));
    });
    if (escape) { food = candidate; return true; }
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

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  // Verificar colisões com as paredes
  const hitWall =
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS;

  // Verificar colisão com obstáculos
  const hitObstacle = obstacles.some(o => same(o, head));

  // Verificar colisão com o próprio corpo
  const hitSelf = snake.some((s, i) =>
    i < snake.length - 1 && same(s, head)
  );

  if (hitWall || hitObstacle || hitSelf) {
    endGame();
    return;
  }

  // Adicionar nova cabeça
  snake.unshift(head);

  if (same(head, food)) {
    // Comer hambúrguer
    score += 10;
    scoreEl.textContent = score;

    if (score % 30 === 0) {
      obstaclePhase++;
      generateObstacles(settings[difficulty].obstacles);
    }

    // Atualizar recorde
    if (score > best) {
      best = score;
      bestEl.textContent = best;

      localStorage.setItem('bobSnakeBest', best);
    }

    if (!placeFood()) { draw(); return; }
    if (score % 100 === 0) {
      scenePhase = Math.floor(score / 100);
      currentSpeed = Math.max(40, settings[difficulty].speed * Math.pow(0.95, scenePhase));
      clearInterval(timer);
      timer = setInterval(tick, currentSpeed);
    }
  } else {
    // Remover a cauda se não comeu
    snake.pop();
  }

  draw();
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

document.querySelectorAll('[data-dir]').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    setDirection(btn.dataset.dir);
  });
});

// =====================================
// PAUSAR E CONTINUAR
// =====================================

function togglePause() {
  if (over) return;

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
    paused ? '▶' : 'Ⅱ';
}
// =====================================
// FIM DE JOGO
// =====================================

function endGame() {
  over = true;

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
  clearInterval(timer);
  if (isFullscreen()) leaveFullscreen();

  overlay.classList.add('hidden');
  game.classList.add('hidden');
  menu.classList.remove('hidden');

  pararMusica();
}

// =====================================
// DESENHAR O CENÁRIO
// =====================================

function draw() {
  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Fundo submarino
  const grad = ctx.createLinearGradient(
    0,
    0,
    0,
    canvas.height
  );

  const sceneHue = (200 + scenePhase * 47) % 360;
  grad.addColorStop(0, `hsl(${sceneHue}, 85%, 36%)`);
  grad.addColorStop(1, `hsl(${(sceneHue + 18) % 360}, 85%, 20%)`);

  ctx.fillStyle = grad;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Grade do tabuleiro
  ctx.strokeStyle = 'rgba(165,237,244,.08)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }

  // Bolhas no fundo
  for (let i = 0; i < 13; i++) {
    const x = (i * 83 + 31) % canvas.width;
    const y = (i * 47 + 22) % canvas.height;

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

  // Obstáculos
  obstacles.forEach((o, i) => {
    drawRock(o.x * CELL, o.y * CELL, i);
  });

  // Hambúrguer
  if (food) drawFood(food.x * CELL, food.y * CELL);

  // Cobra
  snake.forEach((s, i) => {
    drawSnake(s.x * CELL, s.y * CELL, i);
  });
}

// =====================================
// DESENHAR PEDRAS
// =====================================

function drawRock(x, y, i) {
  // Depois de 500 pontos, as pedras mudam de aparência.
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

  ctx.fillStyle = '#f5a62a';

  roundRect(x + 3, y + 4, 14, 5, 3);
  ctx.fill();

  ctx.fillStyle = '#68c84c';
  ctx.fillRect(x + 4, y + 7, 12, 2);

  ctx.fillStyle = '#e94e36';

  roundRect(x + 4, y + 8, 12, 3, 2);
  ctx.fill();

  ctx.fillStyle = '#ffdb68';

  roundRect(x + 3, y + 12, 14, 4, 2);
  ctx.fill();

  ctx.fillStyle = '#fff2b4';

  ctx.beginPath();
  ctx.arc(x + 7, y + 5, 1, 0, Math.PI * 2);
  ctx.fill();
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

resizeBoardForViewport();
draw();