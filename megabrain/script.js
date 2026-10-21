const canvas = document.getElementById('board');
let ctx = canvas.getContext('2d', {alpha:false});
const spriteCache = new Map();
const sceneLayer = document.createElement('canvas');
let sceneCacheKey = '';
const renderStats = {sceneBuilds:0,spriteBuilds:0};

const menu = document.getElementById('menu');
const game = document.getElementById('game');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const mobileBoardQuery = '(max-width:900px), (pointer:coarse)';
let COLS = matchMedia(mobileBoardQuery).matches ? 18 : 30;
let ROWS = matchMedia(mobileBoardQuery).matches ? 18 : 21;
const CELL = 20;
let BOARD_WIDTH = COLS * CELL;
let BOARD_HEIGHT = ROWS * CELL;

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
  requestAnimationFrame(() => {
    fitFullscreenBoard();
    if (padPointer !== null) measurePadHitAreas();
  });
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

// A grade é escolhida ao iniciar uma partida; girar a tela não muda a lógica em curso.
function configureGrid() {
  const mobile = matchMedia(mobileBoardQuery).matches;
  COLS = mobile ? 18 : 30;
  ROWS = mobile ? 18 : 21;
  BOARD_WIDTH = COLS * CELL;
  BOARD_HEIGHT = ROWS * CELL;
  canvas.style.aspectRatio = `${COLS} / ${ROWS}`;
  canvas.style.maxWidth = `${BOARD_WIDTH}px`;
  sceneCacheKey = '';
  spriteCache.clear();
}

function obstacleCount() {
  return Math.max(1,Math.round(settings[difficulty].obstacles * COLS * ROWS / (30*21)));
}

let character = 'bob';
let difficulty = 'easy';
let gameMode = 'classic';
let battleWave = 0;
let battleBurgers = 0;
let battleRewards = 0;
let frostBreath = null;
let bombExplosions = [];
const INITIAL_SNAKE_LENGTH = 4;
let battleEnemies = [];
let battlePendingSpawns = 0;
let battleEnemyId = 0;

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

let cheatFoods = [];
let cheatInput = '';
function mapFoods() { return cheatFoods.length ? cheatFoods : (food ? [food] : []); }

function activateBurgerRow() {
  if(difficulty!=='easy' || paused || over || !menu.classList.contains('hidden') || cheatFoods.length) return false;
  const occupied=[...snake,...activeEnemies()];
  const rows=Array.from({length:ROWS},(_,y)=>y).filter(y=>!occupied.some(p=>p.y===y));
  if(!rows.length) return false;
  // Prefer a clear row; removing rocks from the chosen row only opens paths.
  const clear=rows.filter(y=>!obstacles.some(p=>p.y===y));
  const options=clear.length?clear:rows;
  const y=options[Math.floor(Math.random()*options.length)];
  obstacles=obstacles.filter(p=>p.y!==y);sceneCacheKey='';
  cheatFoods=Array.from({length:COLS},(_,x)=>({x,y,id:++foodSerial,type:'super'}));
  food=cheatFoods[0];previousFood=null;updateStatus();
  return true;
}

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
let directionQueue = [];
const MAX_ACTIVE_POWERS = 3;
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
let inputMotion = null;
let lastVisualPositions = [];
let pauseStartedAt = 0;
let pausedProgress = 0;
const powerStatus = document.getElementById('powerStatus');
const bossStatus = document.getElementById('bossStatus');
const bossHealth = document.getElementById('bossHealth');
const foodHint = document.getElementById('foodHint');
const foodDescriptions = {
  normal: 'Normal · +10 pontos',
  ghost: 'Roxo · Atravessa o próprio corpo por 8s',
  drill: 'Azul · Atravessa pedras e casas por 8s',
  super: 'Amarelo · Imunidade a tudo + supervelocidade por 6s',
  magnet: 'Rosa · Atrai hambúrgueres através dos obstáculos por 10s',
  red: 'Vermelho · Raio pelos olhos: tira vida e paralisa Plankton por 3s'
};

function hasPower(type) { return (powers[type] || 0) > gameTime; }

// Um único timer; a pausa também suspende as atualizações da simulação.
function scheduleTick(delay = Math.max(1,currentSpeed-(performance.now()-lastMoveAt))) {
  clearTimeout(timer);
  if (paused || over || !menu.classList.contains('hidden')) return;
  timer = setTimeout(() => {
    const deadline = lastMoveAt + motionDuration;
    if (performance.now()+.5 >= deadline) tick(deadline);
    scheduleTick();
  }, Math.max(1, delay));
}

function refreshSpeed() {
  const base = Math.max(40, settings[difficulty].speed * Math.pow(0.95, scenePhase));
  const speed = hasPower('super') ? Math.max(25, base * 0.55) : base;
  if (speed !== currentSpeed) {
    currentSpeed = speed;
    clearInterval(timer);
    if (!over && !paused) scheduleTick();
  }
}

function updateStatus() {
  const type = food?.type || 'normal';
  const hint = food ? `NO MAPA · ${foodDescriptions[type]}` : 'Sem hambúrguer disponível';
  if (foodHint.textContent !== hint) foodHint.textContent = hint;
  foodHint.style.setProperty('--food-color', foodTypes[type].color);
  const active = activePowerTypes().slice(0, MAX_ACTIVE_POWERS);
  const key = active.join(',');
  powerStatus.hidden = active.length === 0;
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
      const shortLabels = {ghost:'Atravessa corpo',drill:'Atravessa pedras',super:'Imune + turbo',magnet:'Atrai comida'};
      title.textContent = `${effect.icon} ${shortLabels[type]}`;
      badge.title = effect.label;
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
  const defeated = beam?.defeated && beam.until > gameTime;
  const enemies=activeEnemies();
  bossHealth.hidden = gameMode==='battle' || (!enemies.length && !defeated);
  bossHealth.max = gameMode==='battle' ? battleProfile(battleWave).count*3 : 3;
  bossHealth.value = enemies.reduce((hp,enemy)=>hp+Math.max(0,3-enemy.hits),0);
  const bossLabel = gameMode==='battle'
    ? `⚔ Batalha · Onda ${battleWave} · ${enemies.length} Plankton(s) · Agressividade ${battleProfile(battleWave).aggression}`
    : plankton
    ? `👁 Plankton · ${plankton.stunnedUntil > gameTime ? 'PARALISADO' : 'PERSEGUINDO!'}`
    : defeated ? 'PLANKTON DERROTADO · +50 PONTOS' : 'Bordas livres ↔ ↕';
  if (bossStatus.textContent !== bossLabel) bossStatus.textContent = bossLabel;
  if(!paused && !over && menu.classList.contains('hidden') && currentMusicKey!==selectedMusicKey()) tocarMusica();
}

function activePowerTypes() {
  return Object.keys(powers).filter(type => foodTypes[type]?.duration && hasPower(type));
}

function chooseFoodType(roll = Math.random(), powerRoll = Math.random()) {
  if(gameMode==='battle' && battleRewards>0 && (hasPower('super') || activePowerTypes().length<MAX_ACTIVE_POWERS)) {
    battleRewards--;return 'super';
  }
  if (activeEnemies().length) return bossNextFood;
  if (activePowerTypes().length >= MAX_ACTIVE_POWERS) return 'normal';
  if (roll >= settings[difficulty].specialChance) return 'normal';
  return ['ghost', 'drill', 'super', 'magnet'][Math.floor(powerRoll * 4)];
}

function activeEnemies() {
  return gameMode==='battle' ? battleEnemies : (plankton ? [plankton] : []);
}

function battleProfile(wave) {
  const stage=Math.min(30,Math.max(1,wave));
  return stage<=3 ? {count:1,aggression:stage} : {
    count:Math.min(10,2+Math.floor((stage-4)/3)),aggression:1+(stage-4)%3
  };
}

function enemyColor(enemy) {
  return ['#80c22f','#f5a23b','#ed4662'][(enemy.aggression || 1)-1];
}

function enemyInterval(enemy) {
  return Math.max(70,settings[difficulty].bossInterval * [1,.72,.5][(enemy.aggression || 1)-1]);
}

function fillBattleWave() {
  if(gameMode!=='battle' || !battlePendingSpawns) return;
  const profile=battleProfile(battleWave);
  const candidates=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
    const p={x,y};
    if(torusDistance(p,snake[0])>=8 && !snake.some(s=>same(s,p)) &&
       !obstacles.some(o=>same(o,p)) && !battleEnemies.some(e=>same(e,p)) && !mapFoods().some(item=>same(item,p))) candidates.push(p);
  }
  while(battlePendingSpawns>0 && candidates.length) {
    const pos=candidates.splice(Math.floor(Math.random()*candidates.length),1)[0];
    const enemy={...pos,id:++battleEnemyId,hits:0,stunnedUntil:0,aggression:profile.aggression,motion:null};
    enemy.nextMoveAt=gameTime+enemyInterval(enemy);
    battleEnemies.push(enemy);battlePendingSpawns--;
  }
}

function startBattleWave() {
  battleWave++;
  battlePendingSpawns=battleProfile(battleWave).count;
  bossNextFood='normal';
  fillBattleWave();
}

function updateBattleEnemies() {
  fillBattleWave();
  for(const enemy of [...battleEnemies]) {
    if(!battleEnemies.includes(enemy)) continue;
    if(enemy.stunnedUntil>gameTime) continue;
    const underfoot=obstacles.find(o=>o.bomb && same(o,enemy));
    if(underfoot) {explodeBomb(underfoot);if(!battleEnemies.includes(enemy)) continue;}
    if(same(enemy,snake[0]) && !hasPower('super')) {endGame();return;}
    const from={x:enemy.x,y:enemy.y};
    let moved=false;
    for(let catchup=0;gameTime>=enemy.nextMoveAt && catchup<4;catchup++) {
      const moves=steps.map(d=>wrap({x:enemy.x+d.x,y:enemy.y+d.y}))
        .filter(p=>!battleEnemies.some(other=>other!==enemy && same(other,p)));
      moves.sort((a,b)=>torusDistance(a,snake[0])-torusDistance(b,snake[0]));
      if(moves.length) {Object.assign(enemy,moves[0]);moved=true;}
      enemy.nextMoveAt+=enemyInterval(enemy);
      const bomb=obstacles.find(o=>o.bomb && same(o,enemy));
      if(bomb) {
        explodeBomb(bomb);
        if(!battleEnemies.includes(enemy)) break;
      }
      if(same(enemy,snake[0]) && !hasPower('super')) {endGame();return;}
    }
    if(moved) enemy.motion={from,startedAt:performance.now(),duration:Math.min(currentSpeed,enemyInterval(enemy))};
  }
}

function explodeBomb(bomb) {
  if(gameMode!=='battle' || !obstacles.includes(bomb) || !bomb.bomb) return;
  obstacles=obstacles.filter(o=>o!==bomb);sceneCacheKey='';
  bombExplosions=bombExplosions.filter(effect=>effect.until>gameTime);
  bombExplosions.push({x:bomb.x,y:bomb.y,startedAt:gameTime,until:gameTime+700});
  playEffect('laser');
  const victims=battleEnemies.filter(enemy=> {
    const vector=frostVector(bomb,enemy);
    return Math.hypot(vector.x,vector.y)<=15;
  });
  victims.forEach(enemy=>damageBattleEnemy(enemy,1,0));
  finishBattleAttack();
}

function laserTarget() {
  return activeEnemies().reduce((best,enemy)=>!best || torusDistance(enemy,snake[0])<torusDistance(best,snake[0]) ? enemy : best,null);
}

function spawnPlankton() {
  if(gameMode==='battle') {fillBattleWave();return;}
  if (plankton || !pendingPlanktons) return;
  const head = snake[0];
  const cells = [];
  for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++) {
    const p = {x,y};
    if (torusDistance(head,p) >= 8 && !snake.some(s=>same(s,p)) &&
        !obstacles.some(o=>same(o,p)) && !mapFoods().some(item=>same(item,p))) cells.push(p);
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
    generateObstacles(obstacleCount());
  }
  scenePhase = Math.floor(score / 100);
  if(gameMode==='classic') pendingPlanktons += Math.floor(score/200)-Math.floor(previous/200);
  spawnPlankton();
  refreshSpeed();
}

function damageBattleEnemy(enemy,damage,stun=3000) {
  if(!battleEnemies.includes(enemy)) return;
  enemy.hits=Math.min(3,enemy.hits+damage);
  if(stun) {
    enemy.stunnedUntil=gameTime+stun;
    enemy.nextMoveAt=enemy.stunnedUntil+enemyInterval(enemy);
  }
  if(enemy.hits>=3) {
    battleEnemies=battleEnemies.filter(e=>e!==enemy);
    if(enemy.aggression===3) battleRewards++;
    addScore(50);
  }
}

function finishBattleAttack() {
  if(!battleEnemies.length && !battlePendingSpawns) startBattleWave();
}

function frostVector(from,to) {
  const delta=(a,b,size)=>((b-a+size*1.5)%size)-size/2;
  return {x:delta(from.x,to.x,COLS),y:delta(from.y,to.y,ROWS)};
}

function releaseFrostBreath() {
  const target=laserTarget();
  snake=snake.slice(0,INITIAL_SNAKE_LENGTH);
  previousSnake=previousSnake.slice(0,INITIAL_SNAKE_LENGTH);
  if(!target) return;
  const from={...snake[0]}, vector=frostVector(from,target);
  const angle=Math.atan2(vector.y,vector.x);
  const victims=battleEnemies.map(enemy=>({enemy,v:frostVector(from,enemy)}))
    .filter(({v})=> {
      const distance=Math.hypot(v.x,v.y);
      return (distance===0 || (v.x*Math.cos(angle)+v.y*Math.sin(angle))/distance>=Math.cos(Math.PI/6));
    }).sort((a,b)=>Math.hypot(a.v.x,a.v.y)-Math.hypot(b.v.x,b.v.y));
  const length=Math.max(9,...victims.map(({v})=>Math.hypot(v.x,v.y)));
  frostBreath={from,angle,length,startedAt:gameTime,until:gameTime+900};
  victims.forEach(({enemy},i)=>{damageBattleEnemy(enemy,i===0?2:1);enemy.frozenUntil=gameTime+3000;});
  finishBattleAttack();
}

function collectFood() {
  playEffect('collect');
  const type = food.type || 'normal';
  if (activeEnemies().length) bossNextFood = type === 'normal' ? 'red' : 'normal';
  if (foodTypes[type].duration &&
      (hasPower(type) || activePowerTypes().length < MAX_ACTIVE_POWERS)) {
    powers[type] = gameTime + foodTypes[type].duration;
  }
  const target=laserTarget();
  if (type === 'red' && target) {
    playEffect('laser');
    beam={from:{...snake[0]},to:{...target},until:gameTime+400,defeated:target.hits+1>=3};
    if(gameMode==='battle') {
      damageBattleEnemy(target,1);finishBattleAttack();
    } else {
      target.hits++;target.stunnedUntil=gameTime+3000;
      if(target.hits>=3) {plankton=null;addScore(50);}
    }
  }
  if(gameMode==='battle' && ++battleBurgers>=10) {
    battleBurgers=0;releaseFrostBreath();
  }
  if(cheatFoods.length) cheatFoods=cheatFoods.filter(item=>item.id!==food.id);
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
  if(gameMode==='battle') {updateBattleEnemies();return;}
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

const musicSources = Object.fromEntries([
  'bgm_easy_explore','bgm_easy_boss','bgm_hard_explore','bgm_hard_boss','bgm_battle_mode'
].map(key=>[key,`musicas/${key}.mp3`]));
const musicTracks=Object.fromEntries(Object.entries(musicSources).map(([key,src])=>[key,new Audio(src)]));
const musicas={easy:musicTracks.bgm_easy_explore,medium:musicTracks.bgm_hard_explore,hard:musicTracks.bgm_hard_explore};
function allMusicTracks() {return [...new Set([...Object.values(musicas),...Object.values(musicTracks)])];}
function selectedMusicKey() {
  if(gameMode==='battle') return 'bgm_battle_mode';
  return `bgm_${difficulty==='easy'?'easy':'hard'}_${activeEnemies().length?'boss':'explore'}`;
}

let musicMuted = localStorage.getItem('bobSnakeMusicMuted') === 'true';
let effectsMuted = localStorage.getItem('bobSnakeEffectsMuted') === 'true';
let allMuted = localStorage.getItem('bobSnakeAllMuted') === 'true';
let effectsContext = null;
let effectsGain = null;
const activeEffects = new Set();
const muteMusicBtn = document.getElementById('muteMusicBtn');
const muteEffectsBtn = document.getElementById('muteEffectsBtn');
const muteAllBtn = document.getElementById('muteAllBtn');

allMusicTracks().forEach(musica => {
  musica.muted = musicMuted || allMuted;
  musica.loop = true;
  musica.volume = 0.35;
});

let musicaAtual = null;
let currentMusicKey = null;

function tocarMusica() {
  const key=selectedMusicKey();
  currentMusicKey=key;
  const musicaSelecionada = gameMode==='classic' && !activeEnemies().length ? musicas[difficulty] : musicTracks[key];

  if (
    musicaAtual === musicaSelecionada &&
    !musicaAtual.paused
  ) {
    return;
  }

  if (musicaAtual !== musicaSelecionada) {
    pararMusica();
    musicaAtual = musicaSelecionada;
    musicaAtual.currentTime = 0;
  }
  currentMusicKey=key;
  musicaAtual.muted = musicMuted || allMuted;

  musicaAtual.play().catch(erro => {
    console.log(
      'Não foi possível iniciar a música:',
      erro
    );
  });
}

function pararMusica() {
  allMusicTracks().forEach(musica => {
    musica.pause();
    musica.currentTime = 0;
  });

  musicaAtual = null;
  currentMusicKey = null;
}

// Tons originais: coleta ascendente, laser descendente e queda grave na morte.
const effectNotes = {
  collect:[{type:'sine',from:620,to:930,time:.09,at:0},{type:'sine',from:960,to:1320,time:.1,at:.055}],
  laser:[{type:'sawtooth',from:1450,to:130,time:.19,at:0}],
  death:[{type:'triangle',from:360,to:65,time:.42,at:0},{type:'sine',from:140,to:45,time:.32,at:.1}]
};

function unlockEffects() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!effectsContext) {
      effectsContext = new Audio();
      effectsGain = effectsContext.createGain();
      effectsGain.gain.value = effectsMuted || allMuted ? 0 : .32;
      effectsGain.connect(effectsContext.destination);
    }
    if (effectsContext.state === 'suspended') effectsContext.resume().catch(()=>{});
  } catch { /* Falta de áudio nunca bloqueia os controles ou a simulação. */ }
}

function stopEffects() {
  for (const voice of activeEffects) {
    try {voice.oscillator.stop();} catch { /* Pode já ter encerrado. */ }
    voice.oscillator.disconnect();voice.gain.disconnect();
  }
  activeEffects.clear();
}

function playEffect(kind) {
  if (effectsMuted || allMuted || effectsContext?.state !== 'running') return;
  scheduleEffectNotes(effectsContext,effectsGain,kind);
}

function scheduleEffectNotes(context,output,kind) {
  for (const note of effectNotes[kind] || []) {
    if (activeEffects.size>=12) break;
    const at=context.currentTime+note.at;
    const oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type=note.type;
    oscillator.frequency.setValueAtTime(note.from,at);
    oscillator.frequency.exponentialRampToValueAtTime(note.to,at+note.time);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(.35,at+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,at+note.time);
    oscillator.connect(gain);gain.connect(output);
    const voice={oscillator,gain};activeEffects.add(voice);
    oscillator.onended=()=>{activeEffects.delete(voice);oscillator.disconnect();gain.disconnect();};
    oscillator.start(at);oscillator.stop(at+note.time+.01);
  }
}

function updateMuteButton() {
  muteMusicBtn.textContent = musicMuted ? '🔊 Ativar música' : '🔇 Silenciar música';
  muteMusicBtn.setAttribute('aria-pressed',String(musicMuted));
  muteEffectsBtn.textContent = effectsMuted ? '🔊 Ativar sons' : '🔇 Silenciar sons';
  muteEffectsBtn.setAttribute('aria-pressed',String(effectsMuted));
  muteAllBtn.textContent = allMuted ? '🔊 Restaurar áudio' : '🔇 Silenciar tudo';
  muteAllBtn.setAttribute('aria-pressed',String(allMuted));
}

function applyAudioPreferences() {
  allMusicTracks().forEach(musica=>{musica.muted=musicMuted || allMuted;});
  if (effectsGain) effectsGain.gain.setValueAtTime(effectsMuted || allMuted ? 0 : .32,effectsContext.currentTime);
  if (effectsMuted || allMuted) stopEffects();
  localStorage.setItem('bobSnakeMusicMuted',String(musicMuted));
  localStorage.setItem('bobSnakeEffectsMuted',String(effectsMuted));
  localStorage.setItem('bobSnakeAllMuted',String(allMuted));
  updateMuteButton();
}

muteMusicBtn.addEventListener('click',()=>{musicMuted=!musicMuted;applyAudioPreferences();});
muteEffectsBtn.addEventListener('click',()=>{effectsMuted=!effectsMuted;applyAudioPreferences();});
muteAllBtn.addEventListener('click',()=>{allMuted=!allMuted;applyAudioPreferences();});
updateMuteButton();

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

document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  gameMode=button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(item=>{
    const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));
  });
}));

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
  stopEffects();
  unlockEffects();
  clearInterval(timer);
  configureGrid();

  menu.classList.add('hidden');
  game.classList.remove('hidden');

  score = 0;
  gameTime = 0;
  powers = {};
  lastVisualPositions = [];
  inputMotion = null;
  pausedProgress = 0;
  directionQueue = [];
  clearPadPointer();
  plankton = null;
  battleEnemies = [];
  battleWave = 0;
  battleBurgers = 0;
  battleRewards = 0;
  frostBreath = null;
  bombExplosions = [];
  battlePendingSpawns = 0;
  battleEnemyId = 0;
  pendingPlanktons = 0;
  beam = null;
  bossNextFood = 'normal';
  planktonMotion = null;
  foodSerial = 0;
  food = null;
  cheatFoods = [];
  cheatInput = '';
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

  const count = obstacleCount();
  generateObstacles(count);
  if(gameMode==='battle') startBattleWave();

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
  inputMotion = null;
  motionDuration = currentSpeed;
  updateStatus();
  resizeBoardForViewport();
  startAnimation();
  tocarMusica();

  scheduleTick();
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
    const onFood = mapFoods().some(item=>same(item,p));
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
      !activeEnemies().some(enemy=>same(enemy,p)) &&
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

  if(gameMode==='battle') generated.forEach((obstacle,index)=>{
    if(index%5===0) obstacle.bomb=true;
  });
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
  if(cheatFoods.length) {food=cheatFoods[0];return true;}
  // Cada candidato possui um caminho sem atravessar o corpo e espaço para
  // continuar depois de comer. A simulação inclui o crescimento da cobra.
  const blocked = new Set([...obstacles, ...snake.slice(1), ...activeEnemies()].map(cellKey));
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
    const occupied = new Set([...obstacles, ...body.slice(1, -1), ...activeEnemies()].map(cellKey));
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

function tick(stepAt = performance.now()) {
  if (paused || over) return;
  previousSnake = snake.map(p => ({...p}));
  previousFood = food && {...food};
  lastMoveAt = stepAt;
  inputMotion = null;
  motionDuration = currentSpeed;
  gameTime += currentSpeed;
  refreshSpeed();
  direction = directionQueue.shift() || nextDirection;
  nextDirection = directionQueue[0] || direction;
  moveMagnet();
  const head = wrap({x: snake[0].x + direction.x, y: snake[0].y + direction.y});
  // O ímã pode entregar a comida na posição atual da cabeça.
  const foods=mapFoods();
  const eatenFood=foods.find(item=>same(head,item)) || foods.find(item=>same(snake[0],item));
  const eating=!!eatenFood;
  if(eatenFood) food=eatenFood;
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
  motionDuration = currentSpeed;
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

  if (!d) return;
  const first = directionQueue[0];
  const opposite = (a,b) => a.x === -b.x && a.y === -b.y;
  let queued;
  if (!first) {
    // Entradas neutras nunca alteram a animação nem o relógio de movimento.
    if (same(d,direction) || opposite(d,direction)) return;
    queued = [d];
  } else if (same(d,first)) {
    if (directionQueue.length===1) return;
    queued = [first];
  } else if (opposite(d,first)) {
    // Corrige uma curva ainda não executada, mantendo a segurança do corpo.
    if (same(d,direction) || opposite(d,direction)) return;
    queued = [d];
  } else {
    if (directionQueue.length===2 && same(d,directionQueue[1])) return;
    queued = [first,d]; // O comando lateral mais recente substitui o futuro obsoleto.
  }
  const now = performance.now();
  const changed = !first || !same(first,queued[0]);
  const from = changed ? getVisualHead(movementProgress(now),now) : null;
  directionQueue = queued;
  nextDirection = directionQueue[0];
  if (from) {
    inputMotion = {
      from, target:wrap({x:snake[0].x+queued[0].x,y:snake[0].y+queued[0].y}), tickAt:lastMoveAt,
      startedAt:now, duration:Math.max(1,motionDuration-(now-lastMoveAt))
    };
  }
}

// =====================================
// CONTROLES DE TECLADO
// =====================================

document.addEventListener('keydown', e => {
  if(!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if(difficulty==='easy' && !paused && !over && menu.classList.contains('hidden') && e.key.length===1) {
      cheatInput=(cheatInput+e.key.toLowerCase()).slice(-6);
      if(cheatInput==='atreus') {activateBurgerRow();cheatInput='';}
    } else cheatInput='';
  }
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
    if (!e.repeat) setDirection(map[e.key]);
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
let padHitAreas = [];

function clearPadPointer(event) {
  if (event && event.pointerId !== padPointer) return;
  padPointer = null;
  padDirection = null;
  directionPad.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed'));
}

function measurePadHitAreas() {
  padHitAreas = Array.from(directionPad.querySelectorAll('[data-dir]'),button => ({button,rect:button.getBoundingClientRect()}));
}

function steerFromPointer(event) {
  let hit = padHitAreas.find(({rect}) => event.clientX >= rect.left && event.clientX <= rect.right &&
    event.clientY >= rect.top && event.clientY <= rect.bottom);
  if(!hit) {
    let nearest=101;
    for(const area of padHitAreas) {
      const dx=Math.max(area.rect.left-event.clientX,0,event.clientX-area.rect.right);
      const dy=Math.max(area.rect.top-event.clientY,0,event.clientY-area.rect.bottom);
      const distance=dx*dx+dy*dy;
      if(distance<nearest) {nearest=distance;hit=area;}
    }
  }
  const button = hit?.button;
  if ((button?.dataset.dir || null) === padDirection) return;
  directionPad.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed'));
  if (!button) { padDirection = null; return; }
  button.classList.add('pressed');
  padDirection = button.dataset.dir;
  setDirection(padDirection);
}

directionPad.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  padPointer = event.pointerId;
  measurePadHitAreas();
  // A captura mantém o gesto mesmo no espaço central e fora dos botões.
  try {directionPad.setPointerCapture(event.pointerId);} catch { /* O fallback global encerra o gesto. */ }
  steerFromPointer(event);
});
function movePadPointer(event) {
  if (event.pointerId !== padPointer) return;
  if (event.cancelable) event.preventDefault();
  const samples = event.getCoalescedEvents?.();
  steerFromPointer(samples?.length ? samples[samples.length-1] : event);
}
// pointermove é sempre o fallback; o filtro de direção elimina amostras duplicadas.
directionPad.addEventListener('pointermove', movePadPointer);
if ('onpointerrawupdate' in window) directionPad.addEventListener('pointerrawupdate',movePadPointer);
window.addEventListener('pointerup', clearPadPointer);
window.addEventListener('pointercancel', clearPadPointer);
directionPad.addEventListener('lostpointercapture', clearPadPointer);
window.addEventListener('blur', () => clearPadPointer());

// =====================================
// PAUSAR E CONTINUAR
// =====================================

function togglePause() {
  if (over) return;

  const now = performance.now();
  if (!paused) {
    pausedProgress = movementProgress(now);
    lastVisualPositions = visualSnakePositions(pausedProgress, now);
    pauseStartedAt = now;
    stopEffects();
    clearTimeout(timer);
  } else {
    const elapsed = now-pauseStartedAt;
    lastMoveAt += elapsed;
    if (inputMotion) {inputMotion.startedAt += elapsed;inputMotion.tickAt = lastMoveAt;}
    if (planktonMotion) planktonMotion.startedAt += elapsed;
    for(const enemy of battleEnemies) if(enemy.motion) enemy.motion.startedAt += elapsed;
  }
  clearPadPointer();
  paused = !paused;
  if (!paused) scheduleTick((1-pausedProgress)*currentSpeed);
  document.getElementById('pauseBtn').setAttribute('aria-label',paused ? 'Retomar jogo' : 'Pausar jogo');

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
  if (over) return;
  playEffect('death');
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
  stopEffects();
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
    spriteCache.clear();
    sceneCacheKey = '';
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
  const portable = matchMedia('(max-width:900px), (pointer:coarse)').matches;
  const margin = portable ? 4 : 14;
  const availableWidth = bounds.width - (sidePad ? pad.width+36 : margin*2);
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
  game.style.setProperty('--map-left',`${margin+(availableWidth-width)/2}px`);
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

function movementProgress(now = performance.now()) {
  return Math.min(1,Math.max(0,(now-lastMoveAt)/motionDuration));
}

// Desenha o passo em andamento, em vez de ficar uma célula atrás da simulação.
function getVisualHead(alpha = movementProgress(), now = performance.now()) {
  if (!snake.length) return null;
  if ((paused || over) && lastVisualPositions.length) return lastVisualPositions[0];
  const next = directionQueue[0] || nextDirection;
  const target = wrap({x:snake[0].x+next.x,y:snake[0].y+next.y});
  if (inputMotion?.tickAt === lastMoveAt && same(target,inputMotion.target)) {
    const progress = Math.min(1,Math.max(0,(now-inputMotion.startedAt)/inputMotion.duration));
    return interpolateCell(inputMotion.from,target,progress);
  }
  return interpolateCell(snake[0],target,alpha);
}

function visualSnakePositions(alpha, now) {
  if ((paused || over) && lastVisualPositions.length) return lastVisualPositions;
  return snake.map((cell,i) => i===0 ? getVisualHead(alpha,now) : interpolateCell(cell,snake[i-1],alpha));
}

function startAnimation() {
  cancelAnimationFrame(animationFrame);
  let wasPaused = false;
  const render = now => {
    if(game.classList.contains('hidden')) return;
    if (paused && wasPaused) {animationFrame = requestAnimationFrame(render);return;}
    wasPaused = paused;
    const alpha = movementProgress(now);
    draw(alpha,now);
    if(!over) animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

// =====================================
// DESENHAR O CENÁRIO
// =====================================

function paintCachedScene() {
  const key = `${COLS}:${ROWS}:${scenePhase}:${obstaclePhase}:${canvas.width}:${canvas.height}:${obstacles.map(o=>`${cellKey(o)}:${o.bomb?1:0}`).join(',')}`;
  if (key !== sceneCacheKey) {
    sceneLayer.width = canvas.width; sceneLayer.height = canvas.height;
    const target = sceneLayer.getContext('2d');
    target.setTransform(canvas.width/BOARD_WIDTH,0,0,canvas.height/BOARD_HEIGHT,0,0);
    // Reutiliza os desenhos vetoriais no cache, sem alterar o contexto principal.
    const main = ctx;ctx = target;
    try { drawStaticScene(); } finally {ctx = main;}
    sceneCacheKey = key;renderStats.sceneBuilds++;
  }
  ctx.drawImage(sceneLayer,0,0,BOARD_WIDTH,BOARD_HEIGHT);
}

function drawStaticScene() {
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

  drawSeaDecorations();

  // Obstáculos
  obstacles.forEach((o, i) => {
    const kind = (i + scenePhase) % 4;
    if(o.bomb) drawBomb(o.x*CELL,o.y*CELL);
    else if (kind === 0) drawRock(o.x * CELL, o.y * CELL, i);
    else drawHouse(o.x * CELL, o.y * CELL, kind);
  });

}

function paintSnakeSprite(x,y,index) {
  const scaleX=canvas.width/BOARD_WIDTH,scaleY=canvas.height/BOARD_HEIGHT;
  const key=`${character}:${index===0}:${hasPower('ghost')}:${hasPower('drill')}:${hasPower('super')}:${scaleX}:${scaleY}`;
  const padding=8,size=CELL+padding*2;
  let sprite=spriteCache.get(key);
  if(!sprite) {
    sprite=document.createElement('canvas');
    sprite.width=Math.ceil(size*scaleX);sprite.height=Math.ceil(size*scaleY);
    const target=sprite.getContext('2d');
    target.setTransform(scaleX,0,0,scaleY,padding*scaleX,padding*scaleY);
    const main=ctx;ctx=target;
    try {applyCharacterEffect();drawSnake(0,0,index===0?0:1);} finally {ctx=main;}
    spriteCache.set(key,sprite);renderStats.spriteBuilds++;
  }
  ctx.drawImage(sprite,x-padding,y-padding,sprite.width/scaleX,sprite.height/scaleY);
}

function draw(alpha = movementProgress(), now = performance.now()) {
  paintCachedScene();

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

  // Hambúrguer
  for(const item of mapFoods()) {
    const from = previousFood?.id === item.id ? previousFood : item;
    paintWrapped(interpolateCell(from, item, alpha), (x,y) => {
      ctx.save(); drawFood(x,y,item); ctx.restore();
    });
  }

  drawBombExplosions(alpha);
  drawFrostBreath(alpha);
  drawPlankton(now);

  // Interpolação contínua entre passos; a lógica de colisão continua na grade.
  const positions = visualSnakePositions(alpha,now);
  lastVisualPositions = positions;
  ctx.save();
  ctx.globalAlpha = hasPower('drill') ? .55 : 1;
  ctx.strokeStyle = character === 'bob' ? '#ffd92e' : '#ff829b';
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for(let i=1;i<positions.length;i++) {
    const a=positions[i-1], b=positions[i];
    if(Math.abs(a.x-b.x)>1.1 || Math.abs(a.y-b.y)>1.1) continue;
    ctx.moveTo(a.x*CELL+10,a.y*CELL+10);ctx.lineTo(b.x*CELL+10,b.y*CELL+10);
  }
  ctx.stroke();
  ctx.restore();
  positions.forEach((cell,i) => paintWrapped(cell, (x,y) => {
    paintSnakeSprite(x,y,i);
  }));
  drawEyeLaser(alpha,now);
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

function drawFood(x, y, item = food) {
  ctx.fillStyle = '#4c301a';

  roundRect(x + 3, y + 5, 14, 10, 4);
  ctx.fill();

  const type = foodTypes[item?.type || 'normal'];
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
  if (item?.type !== 'normal') {
    ctx.fillStyle = '#112c49'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText({ghost:'G', drill:'O', super:'⚡', magnet:'M', red:'ϟ'}[item.type] || '', x+10, y+12);
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
  for(let i=0;i<8;i++) ctx.fillText(['🪸','🐚','🪼'][i%3],(i*79+scenePhase*17)%(BOARD_WIDTH-20),BOARD_HEIGHT-20-(i%3)*13);
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

function getEyeOrigins(alpha = movementProgress(), now = performance.now()) {
  if (!snake.length) return [];
  const head = getVisualHead(alpha,now);
  const eyes = character === 'bob' ? [{x:7.5,y:7},{x:13.5,y:7}] : [{x:8,y:9},{x:12,y:9}];
  return eyes.map(eye => ({
    x:(head.x*CELL+eye.x)%BOARD_WIDTH,
    y:(head.y*CELL+eye.y)%BOARD_HEIGHT
  }));
}

function drawEyeLaser(alpha = movementProgress(), now = performance.now()) {
  if (!beam || beam.until <= gameTime) return;
  const target = {x:beam.to.x*CELL+10,y:beam.to.y*CELL+10};
  ctx.save();ctx.lineCap='round';ctx.shadowColor='#ff334e';ctx.shadowBlur=8;
  for (const eye of getEyeOrigins(alpha,now)) {
    ctx.strokeStyle='#ff334e';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(eye.x,eye.y);ctx.lineTo(target.x,target.y);ctx.stroke();
    ctx.strokeStyle='#fff4e9';ctx.lineWidth=.7;ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(eye.x,eye.y,1.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function drawBomb(x,y) {
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#17283b';ctx.strokeStyle='#ffab55';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(10,12,7,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffe9a4';ctx.beginPath();ctx.moveTo(10,5);ctx.quadraticCurveTo(9,0,15,2);ctx.stroke();
  ctx.fillStyle='#ff593e';ctx.beginPath();ctx.arc(15,2,2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffbb72';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('!',10,15);
  ctx.restore();
}

function drawBombExplosions(alpha) {
  bombExplosions=bombExplosions.filter(effect=>effect.until>gameTime);
  for(const effect of bombExplosions) {
    const age=gameTime+(!paused && !over?alpha*motionDuration:0)-effect.startedAt;
    const progress=Math.max(0,Math.min(1,age/700));
    const radius=Math.max(1,15*CELL*progress);
    for(const dx of [-BOARD_WIDTH,0,BOARD_WIDTH]) for(const dy of [-BOARD_HEIGHT,0,BOARD_HEIGHT]) {
      ctx.save();ctx.globalAlpha=(1-progress)*.35;
      ctx.strokeStyle='#ffbd58';ctx.fillStyle='rgba(255,117,41,.25)';ctx.lineWidth=3;
      ctx.beginPath();ctx.arc((effect.x+.5)*CELL+dx,(effect.y+.5)*CELL+dy,radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    }
  }
}

function drawFrostBreath(alpha) {
  if(!frostBreath || frostBreath.until<=gameTime) return;
  const age=gameTime+(!paused && !over ? alpha*motionDuration : 0)-frostBreath.startedAt;
  const progress=Math.max(0,Math.min(1,age/900));
  const radius=frostBreath.length*CELL*Math.min(1,progress*3);
  // Repeat at portal edges so the visible cone agrees with toroidal hit detection.
  for(const dx of [-BOARD_WIDTH,0,BOARD_WIDTH]) for(const dy of [-BOARD_HEIGHT,0,BOARD_HEIGHT]) {
    const x=(frostBreath.from.x+.5)*CELL+dx,y=(frostBreath.from.y+.5)*CELL+dy;
    ctx.save();ctx.translate(x,y);ctx.rotate(frostBreath.angle);
    ctx.globalAlpha=(1-progress)*.55;
    const gradient=ctx.createRadialGradient(0,0,0,0,0,Math.max(1,radius));
    gradient.addColorStop(0,'#efffff');gradient.addColorStop(1,'#60caff');ctx.fillStyle=gradient;
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,radius,-Math.PI/6,Math.PI/6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#e9ffff';ctx.lineWidth=1;
    for(let i=0;i<14;i++) {
      const theta=((i%5)/4-.5)*Math.PI/3;
      const r=radius*((i*7%13)+1)/14;
      const px=Math.cos(theta)*r,py=Math.sin(theta)*r;
      ctx.beginPath();ctx.moveTo(px-2,py);ctx.lineTo(px+2,py);ctx.moveTo(px,py-2);ctx.lineTo(px,py+2);ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPlankton(now = performance.now()) {
  for(const enemy of activeEnemies()) drawEnemy(enemy,now);
}

function drawEnemy(enemy,now) {
  const motion = gameMode==='battle' ? enemy.motion : planktonMotion;
  const alpha = !paused && !over && motion ? Math.min(1,(now-motion.startedAt)/motion.duration) : 1;
  const position = interpolateCell(motion?.from || enemy,enemy,alpha);
  paintWrapped(position, (x,y) => {
  ctx.save();ctx.translate(x,y);
  if(gameMode==='battle') {
    ctx.fillStyle='rgba(4,30,49,.85)';ctx.fillRect(1,-6,18,4);
    ctx.fillStyle='#92ed76';ctx.fillRect(2,-5,16*Math.max(0,3-enemy.hits)/3,2);
  }
  ctx.fillStyle=enemy.frozenUntil>gameTime ? '#a8efff' : enemyColor(enemy);
  if(enemy.stunnedUntil>gameTime) {ctx.shadowColor='#66e6ff';ctx.shadowBlur=8;}
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