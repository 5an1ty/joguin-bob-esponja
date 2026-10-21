// Preferências locais: a primeira partida usa arrasto e poder por toque duplo.
const controlModes=['swipe','joystick','dpad'];
let mobileControlMode=localStorage.getItem('bobSnakeControlMode') || 'swipe';
if(!controlModes.includes(mobileControlMode))mobileControlMode='swipe';
let showMobilePower=localStorage.getItem('bobSnakeShowPowerButton')==='true';
let joystickPointer=null;
let lastJoystickDirection=null;
let lastPowerTap=null;
const powerTapPointers=new Map();
const dock=document.createElement('div');dock.className='mobile-dock';
const joystick=document.createElement('div');joystick.id='joystick';joystick.setAttribute('role','group');joystick.setAttribute('aria-label','Joystick: arraste para mudar de direção');joystick.tabIndex=0;
joystick.innerHTML='<span class="joystick-guide" aria-hidden="true">✥</span><span class="joystick-stick" aria-hidden="true"></span>';
game.append(dock);
dock.append(directionPad,joystick,document.getElementById('abilityBtn'),document.getElementById('topPauseBtn'));
function applyControlPreferences(){
  game.dataset.control=mobileControlMode;
  game.classList.toggle('show-mobile-power',showMobilePower);
  document.querySelectorAll('button[data-control]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.control===mobileControlMode)));
  document.getElementById('showPowerButton').checked=showMobilePower;
  resetMobileInput();
  if(mobileControlMode!=='swipe')stopMovementGuide();
  resizeBoardForViewport();
}
document.querySelectorAll('button[data-control]').forEach(button=>button.addEventListener('click',()=>{
  mobileControlMode=button.dataset.control;
  localStorage.setItem('bobSnakeControlMode',mobileControlMode);
  applyControlPreferences();
}));
document.getElementById('showPowerButton').addEventListener('change',event=>{
  showMobilePower=event.target.checked;
  localStorage.setItem('bobSnakeShowPowerButton',String(showMobilePower));
  applyControlPreferences();
});
function resetMobileInput(){
  joystickPointer=null;lastJoystickDirection=null;
  joystick?.style.setProperty('--stick-x','0px');joystick?.style.setProperty('--stick-y','0px');
  lastPowerTap=null;powerTapPointers.clear();
}
function steerJoystick(event){
  if(paused || over || mobileControlMode!=='joystick')return;
  const rect=joystick.getBoundingClientRect();
  const dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2);
  const distance=Math.hypot(dx,dy),scale=distance>38?38/distance:1;
  joystick.style.setProperty('--stick-x',`${dx*scale}px`);joystick.style.setProperty('--stick-y',`${dy*scale}px`);
  if(distance<14){lastJoystickDirection=null;return;}
  const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  if(dir!==lastJoystickDirection){setDirection(dir);lastJoystickDirection=dir;}
}
joystick.addEventListener('pointerdown',event=>{
  if(paused || over || (event.pointerType==='mouse' && event.button!==0))return;
  event.preventDefault();lastPowerTap=null;joystickPointer=event.pointerId;
  try{joystick.setPointerCapture(event.pointerId);}catch{}
  steerJoystick(event);
});
joystick.addEventListener('pointermove',event=>{if(event.pointerId===joystickPointer){event.preventDefault();steerJoystick(event);}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,event=>{
  if(event.pointerId===joystickPointer){joystickPointer=null;lastJoystickDirection=null;joystick.style.setProperty('--stick-x','0px');joystick.style.setProperty('--stick-y','0px');}
});
joystick.addEventListener('keydown',event=>{
  const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[event.key];
  if(dir){event.preventDefault();setDirection(dir);}
});
// Dois toques curtos e próximos ativam o poder. Arrastar, segurar, cancelar,
// usar controles ou tocar com dois dedos desfaz a sequência.
canvas.addEventListener('pointerdown',event=>{
  if(!mobileGameplay || paused || over || gameMode!=='battle')return;
  const simultaneous=powerTapPointers.size>0;
  if(simultaneous){for(const tap of powerTapPointers.values())tap.cancelled=true;lastPowerTap=null;}
  powerTapPointers.set(event.pointerId,{x:event.clientX,y:event.clientY,at:performance.now(),cancelled:simultaneous});
});
canvas.addEventListener('pointermove',event=>{
  const tap=powerTapPointers.get(event.pointerId);if(!tap)return;
  if(Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>10){tap.cancelled=true;lastPowerTap=null;}
});
canvas.addEventListener('pointerup',event=>{
  const tap=powerTapPointers.get(event.pointerId);powerTapPointers.delete(event.pointerId);
  if(!tap || paused || over || gameMode!=='battle' || playableTutorial?.lessonPhase==='demo')return;
  const now=performance.now();
  if(tap.cancelled || now-tap.at>230 || Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>10){lastPowerTap=null;return;}
  if(lastPowerTap && now-lastPowerTap.at<=300 && Math.hypot(tap.x-lastPowerTap.x,tap.y-lastPowerTap.y)<=36){
    lastPowerTap=null;useAbility();
  }else lastPowerTap={x:tap.x,y:tap.y,at:now};
});
canvas.addEventListener('pointercancel',resetMobileInput);
directionPad.addEventListener('pointerdown',()=>{lastPowerTap=null;});
window.addEventListener('blur',resetMobileInput);
function mobileGridSize(width,height){
  const short=14;
  return width>height?{cols:Math.max(short,Math.round(short*width/height)),rows:short}:{cols:short,rows:Math.max(short,Math.round(short*height/width))};
}
let mobileFoodOcclusions=[];
function foodUnderMobileControls(cell){
  if(!mobileGameplay || !isFullscreen())return false;
  return mobileFoodOcclusions.some(box=>cell.x>=box.left && cell.x<=box.right && cell.y>=box.top && cell.y<=box.bottom);
}
function reflowMobileArena(cols,rows){
  if(COLS===cols && ROWS===rows)return false;
  const oldCols=COLS,oldRows=ROWS;
  const original=snake.map(p=>({...p}));
  COLS=cols;ROWS=rows;BOARD_WIDTH=COLS*CELL;BOARD_HEIGHT=ROWS*CELL;
  const rebuilt=[wrap(original[0])];
  const occupied=new Set([cellKey(rebuilt[0])]);
  for(let i=1;i<original.length;i++){
    const dx=((original[i].x-original[i-1].x+oldCols*1.5)%oldCols)-oldCols/2;
    const dy=((original[i].y-original[i-1].y+oldRows*1.5)%oldRows)-oldRows/2;
    const cell=wrap({x:rebuilt[i-1].x+dx,y:rebuilt[i-1].y+dy});
    if(occupied.has(cellKey(cell)))break;
    rebuilt.push(cell);occupied.add(cellKey(cell));
  }
  snake=rebuilt;
  for(const enemy of activeEnemies()){
    const candidate=wrap(enemy);
    if(!occupied.has(cellKey(candidate))){enemy.x=candidate.x;enemy.y=candidate.y;}
    else for(let key=0;key<COLS*ROWS;key++)if(!occupied.has(key)){enemy.x=key%COLS;enemy.y=Math.floor(key/COLS);break;}
    occupied.add(cellKey(enemy));enemy.motion=null;
  }
  // Preserve bombs and obstacles where they remain safe in the resized grid.
  obstacles=obstacles.filter(p=>p.x<COLS && p.y<ROWS && !occupied.has(cellKey(p)));
  cheatFoods=cheatFoods.filter(p=>p.x<COLS && p.y<ROWS && !occupied.has(cellKey(p)));
  food=food?{...food,...wrap(food)}:null;
  previousSnake=snake.map(p=>({...p}));previousFood=null;
  inputMotion=null;lastVisualPositions=[];planktonMotion=null;beam=null;frostBreath=null;
  directionQueue=[];nextDirection={...direction};resetMobileInput();
  sceneCacheKey='';spriteCache.clear();
  canvas.style.aspectRatio=`${COLS} / ${ROWS}`;canvas.style.maxWidth='none';
  return true;
}
function fitMobileFullscreenBoard(){
  const bounds=game.getBoundingClientRect();if(!bounds.width || !bounds.height)return;
  const dimensions=mobileGridSize(bounds.width,bounds.height);
  const changed=reflowMobileArena(dimensions.cols,dimensions.rows);
  game.style.setProperty('--map-width',`${bounds.width}px`);
  game.style.setProperty('--map-height',`${bounds.height}px`);
  game.style.setProperty('--map-left','0px');game.style.setProperty('--map-top','0px');
  const frame=document.querySelector('.board-wrap');
  // Store rectangles in cell coordinates once per layout, never on every spawn.
  const frameRect=frame.getBoundingClientRect();
  const zones=[document.querySelector('.game-head'),document.querySelector('.status-bar'),...dock.children];
  mobileFoodOcclusions=zones.filter(el=>getComputedStyle(el).display!=='none').map(el=>{
    const b=el.getBoundingClientRect();
    return {left:(b.left-frameRect.left)/bounds.width*COLS-.5,right:(b.right-frameRect.left)/bounds.width*COLS-.5,top:(b.top-frameRect.top)/bounds.height*ROWS-.5,bottom:(b.bottom-frameRect.top)/bounds.height*ROWS-.5};
  });
  if(food && (changed || foodUnderMobileControls(food) || snake.some(p=>same(p,food)) || obstacles.some(p=>same(p,food)) || activeEnemies().some(p=>same(p,food)))){const type=food.type;if(placeFood())food.type=type;}
  if(changed && playableTutorial?.lessonPhase==='demo')prepareTutorialLesson(playableTutorial.stage);
  syncCanvasResolution();
}

// Guia de gesto independente da fase: desacelera e devolve o ritmo sem reiniciar.
let movementGuide = null;
function movementGuideSpeed(){return movementGuide ? movementGuide.factor : 1;}
function stopMovementGuide(){movementGuide=null;document.getElementById('movementGuide')?.remove();}
function beginMovementGuide(){
  if(mobileControlMode!=='swipe' || localStorage.getItem('bobSnakeDragLearned')==='true' || (playableTutorial && !(playableTutorial.stage===0 && playableTutorial.lessonPhase==='practice')))return;
  stopMovementGuide();
  movementGuide={startedAt:performance.now(),factor:1,phase:'demo',gestures:[],lastFrame:performance.now()};
  const hint=document.createElement('div');hint.id='movementGuide';hint.setAttribute('role','status');
  hint.innerHTML='<span class="gesture-hand" aria-hidden="true">☝</span><strong>Arraste para fazer uma curva</strong><span>Observe o dedo. Depois, tente para dois lados.</span>';
  document.querySelector('.board-wrap').append(hint);
}
function recordMovementGesture(dir){
  if(!movementGuide || movementGuide.phase!=='practice')return;
  if(movementGuide.gestures.at(-1)!==dir)movementGuide.gestures.push(dir);
  if(movementGuide.gestures.length>=2){
    movementGuide.phase='finish';movementGuide.finishedAt=performance.now();
    localStorage.setItem('bobSnakeDragLearned','true');
    document.querySelector('#movementGuide strong').textContent='Isso! Continue a aventura.';
    document.querySelector('#movementGuide>span:last-child').textContent='Arraste em qualquer ponto do tabuleiro.';
  }
}
function updateMovementGuide(now){
  if(!movementGuide)return;
  const guide=movementGuide;
  const elapsed=now-guide.lastFrame;guide.lastFrame=now;
  if(paused || over){guide.startedAt+=elapsed;if(guide.finishedAt)guide.finishedAt+=elapsed;return;}
  const progress=Math.min(1,(now-guide.startedAt)/1800);
  guide.factor=1+3*progress;
  if(progress===1 && guide.phase==='demo'){
    // Demonstra uma curva real, mantendo o personagem na mesma fase.
    const options=direction.x?['down','up']:['right','left'];
    for(const name of options){
      const d={down:{x:0,y:1},up:{x:0,y:-1},right:{x:1,y:0},left:{x:-1,y:0}}[name];
      const cell=wrap({x:snake[0].x+d.x,y:snake[0].y+d.y});
      if(![...obstacles,...snake,...activeEnemies()].some(p=>same(p,cell))){setDirection(name);break;}
    }
    guide.phase='practice';
    document.querySelector('#movementGuide strong').textContent='Sua vez: arraste para virar';
  }
  if(guide.phase==='finish'){
    guide.factor=1+3*Math.max(0,1-(now-guide.finishedAt)/1200);
    if(now-guide.finishedAt>=1200)stopMovementGuide();
  }
  refreshSpeed();
}
function syncMobileControls(){
  const top=document.getElementById('topPauseBtn');if(!top)return;
  top.dataset.state=over?'over':paused?'paused':'playing';
  top.textContent=over?'Jogar novamente':paused?'Continuar':'Pausar';
  top.setAttribute('aria-label',over?'Jogar novamente':paused?'Retomar jogo':'Pausar jogo');
}
// A habilidade pronta é indicada por estado real, incluindo alterações de recarga.
const abilityButton=document.getElementById('abilityBtn');
new MutationObserver(()=>{
  abilityButton.classList.toggle('ability-ready',!abilityButton.hidden && !abilityButton.disabled);
}).observe(abilityButton,{attributes:true,attributeFilter:['disabled','hidden']});


// A escolha acontece antes de solicitar tela cheia para preservar a ativação do toque.
let orientationResumePending=false;
let preferredFullscreenOrientation=null;
let orientationDialogWasPlaying=false;
const orientationDialog=document.createElement('dialog');
orientationDialog.id='orientationDialog';
orientationDialog.setAttribute('aria-labelledby','orientationTitle');
orientationDialog.innerHTML='<h2 id="orientationTitle">Como você quer jogar?</h2><p>Escolha a posição do celular.</p><div class="orientation-options"><button type="button" data-orientation="portrait"><span aria-hidden="true">▯</span>Vertical</button><button type="button" data-orientation="landscape"><span aria-hidden="true">▭</span>Horizontal</button></div><button type="button" id="cancelOrientation">Voltar ao jogo</button>';
game.append(orientationDialog);
const orientationHint=document.createElement('p');orientationHint.id='orientationHint';orientationHint.hidden=true;orientationHint.setAttribute('role','status');game.append(orientationHint);
function chooseFullscreenOrientation(){
  if(orientationDialog.open)return;
  orientationDialogWasPlaying=!paused && !over;
  if(orientationDialogWasPlaying)togglePause();
  orientationDialog.showModal();
}
function cancelFullscreenOrientation(){
  orientationDialog.close();orientationResumePending=false;
  if(orientationDialogWasPlaying && paused && !over)togglePause();
  orientationDialogWasPlaying=false;
}
orientationDialog.addEventListener('cancel',event=>{event.preventDefault();cancelFullscreenOrientation();});
document.getElementById('cancelOrientation').addEventListener('click',cancelFullscreenOrientation);
orientationDialog.querySelectorAll('[data-orientation]').forEach(button=>button.addEventListener('click',async()=>{
  orientationDialog.close();
  orientationResumePending=orientationDialogWasPlaying;
  orientationDialogWasPlaying=false;
  await toggleFullscreen(button.dataset.orientation);
}));
async function applyFullscreenOrientation(value){
  preferredFullscreenOrientation=value;
  try{await screen.orientation?.lock?.(value);}catch{ /* Safari e alguns WebViews exigem rotação manual. */ }
  updateOrientationHint();
}
function clearFullscreenOrientation(){
  preferredFullscreenOrientation=null;orientationResumePending=false;orientationHint.hidden=true;
  try{screen.orientation?.unlock?.();}catch{}
}
function updateOrientationHint(){
  if(!isFullscreen()){
    if(preferredFullscreenOrientation)clearFullscreenOrientation();
    return;
  }
  if(!preferredFullscreenOrientation)return;
  const matches=preferredFullscreenOrientation==='landscape'?innerWidth>innerHeight:innerHeight>=innerWidth;
  orientationHint.hidden=matches;
  orientationHint.textContent=preferredFullscreenOrientation==='landscape'?'Gire o celular para jogar na horizontal.':'Gire o celular para jogar na vertical.';
  if(matches && orientationResumePending){orientationResumePending=false;if(paused && !over)togglePause();}
}

applyControlPreferences();
