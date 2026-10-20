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
  #game:fullscreen {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    overflow: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: max(8px, env(safe-area-inset-top))
             max(8px, env(safe-area-inset-right))
             max(8px, env(safe-area-inset-bottom))
             max(8px, env(safe-area-inset-left));
    background: #062b49;
  }

  #game:fullscreen #board,
  #game.fallback-fullscreen #board {
    width: min(100%, calc((100vh - 150px) * 30 / 21)) !important;
    max-width: none !important;
    height: auto !important;
    aspect-ratio: 30 / 21;
    object-fit: contain;
  }

  #game.fallback-fullscreen {
    position: fixed !important;
    inset: 0 !important;
    z-index: 99999 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    overflow: auto !important;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    padding: max(8px, env(safe-area-inset-top))
             max(8px, env(safe-area-inset-right))
             max(8px, env(safe-area-inset-bottom))
             max(8px, env(safe-area-inset-left));
    background: #062b49;
  }

  #game.fallback-fullscreen #board {
    width: min(100%, calc((100vh - 150px) * 30 / 21)) !important;
    max-width: none !important;
    height: auto !important;
  }

  #game:fullscreen #fullscreenBtn,
  #game.fallback-fullscreen #fullscreenBtn {
    align-self: flex-end;
    margin: 0 0 6px auto;
  }

  @media (max-height: 500px) {
    #game:fullscreen #board,
    #game.fallback-fullscreen #board {
      width: min(100%, calc((100vh - 105px) * 30 / 21)) !important;
    }
  }
`;

document.head.appendChild(fullscreenStyles);

async function toggleFullscreen() {
  const isNativeFullscreen =
    document.fullscreenElement === game;

  const isFallbackFullscreen =
    game.classList.contains('fallback-fullscreen');

  if (isNativeFullscreen || isFallbackFullscreen) {
    if (isNativeFullscreen && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn(
          'Não foi possível sair da tela cheia nativa:',
          error
        );
      }
    }

    game.classList.remove('fallback-fullscreen');
    fullscreenBtn.textContent = '⛶ Tela cheia';
    return;
  }

  if (game.requestFullscreen) {
    try {
      await game.requestFullscreen();
      fullscreenBtn.textContent = '⛶ Sair da tela cheia';
      return;
    } catch (error) {
      console.warn(
        'Tela cheia nativa indisponível; usando modo adaptável.',
        error
      );
    }
  }

  // Alternativa visual para navegadores sem Fullscreen API.
  game.classList.add('fallback-fullscreen');
  fullscreenBtn.textContent = '⛶ Sair da tela cheia';
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === game;

  if (
    !active &&
    !game.classList.contains('fallback-fullscreen')
  ) {
    fullscreenBtn.textContent = '⛶ Tela cheia';
  }

  resizeBoardForViewport();
});

window.addEventListener('resize', resizeBoardForViewport);
window.addEventListener('orientationchange', resizeBoardForViewport);

function resizeBoardForViewport() {
  const fullscreen =
    document.fullscreenElement === game ||
    game.classList.contains('fallback-fullscreen');

  if (fullscreen) {
    const availableHeight = Math.max(
      120,
      window.innerHeight - 150
    );

    const widthFromHeight =
      availableHeight * COLS / ROWS;

    const availableWidth = Math.max(
      120,
      window.innerWidth - 16
    );

    canvas.style.width =
      `${Math.min(availableWidth, widthFromHeight)}px`;

    canvas.style.maxWidth = 'none';
  } else {
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${COLS * CELL}px`;
  }
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

  const count = settings[difficulty].obstacles;
  generateObstacles(count);

  placeFood();

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
    settings[difficulty].speed
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
      !closeToHead
    ) {
      generated.push(p);
    }
  }

  obstacles = generated;
}
// =====================================
// POSICIONAR O HAMBÚRGUER
// =====================================

function placeFood() {
  let p;
  let tries = 0;

  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };

    tries++;
  } while (
    tries < 2000 &&
    (
      snake.some(s => same(s, p)) ||
      obstacles.some(o => same(o, p))
    )
  );

  food = p;
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

    // Aos 500 pontos, trocar os obstáculos uma única vez.
    if (score >= 30 && obstaclePhase === 0) {
      obstaclePhase = 1;
      generateObstacles(settings[difficulty].obstacles);
    }

    // Atualizar recorde
    if (score > best) {
      best = score;
      bestEl.textContent = best;

      localStorage.setItem('bobSnakeBest', best);
    }

    placeFood();

    // Aumentar a velocidade a cada 50 pontos
    if (
      score > 0 &&
      score % 50 === 0 &&
      settings[difficulty].speed > 55
    ) {
      clearInterval(timer);

      timer = setInterval(
        tick,
        settings[difficulty].speed - 8
      );
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

  grad.addColorStop(0, '#0a78ad');
  grad.addColorStop(1, '#064d83');

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
  drawFood(food.x * CELL, food.y * CELL);

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
  ctx.fillStyle = obstaclePhase ? '#5a1d58' : '#123f68';

  roundRect(x + 2, y + 3, 16, 15, 5);
  ctx.fill();

  ctx.fillStyle = obstaclePhase
    ? (i % 2 ? '#b64c9c' : '#d66bb5')
    : (i % 2 ? '#657e9b' : '#8197ac');

  roundRect(x + 2, y + 1, 16, 15, 5);
  ctx.fill();

  ctx.fillStyle = obstaclePhase ? '#ffd1f0' : '#a6b7c4';

  ctx.beginPath();
  ctx.arc(x + 7, y + 5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = obstaclePhase ? '#7b286d' : '#4b6887';

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