// Shared lesson copy and illustrations for both the menu and the playable training.
const battleLessons = [
  {id:'food', title:'O almoço está servido!', task:'Leve Bob até o hambúrguer.', icons:['🧽','→','🍔'], text:'Foque nos hambúrgueres: eles dão pontos e fazem o personagem crescer. Use as setas, WASD ou deslize pelo direcional. As bordas são portais: saia por um lado e volte pelo outro.'},
  {id:'ability', title:'Uma espátula, um superlanche!', task:'Aperte C ou toque em Power.', icons:['🧽','🍳','⚡'], text:'C no PC ou Power no celular ativa sua habilidade. Bob gira a espátula e cria um hambúrguer amarelo à frente: imunidade e turbo por 6 segundos. A recarga normal é de 30 segundos. Depois de 2 abates sem usar o poder, a dica piscante oferece uma ativação grátis, sem gastar carga ou recarga.'},
  {id:'waves', title:'Um raio e uma nova onda!', task:'Este Plankton já está ferido. Pegue o hambúrguer vermelho para derrotá-lo.', icons:['🍔','ϟ','👁️'], text:'Hambúrgueres vermelhos disparam raios que causam 1 de dano e paralisam por 3 segundos. Derrote todos os Planktons para avançar: primeiro duelos, depois grupos até 10. Verde, laranja e vermelho indicam agressividade. Ondas 1–2: todos têm 3 de vida. Ondas 3–5: verde 4, demais 3. Da onda 6: verde 5, laranja 4, vermelho 3. Derrotar um vermelho rende um hambúrguer amarelo.'},
  {id:'bomb', title:'Armadilha à vista!', task:'Observe o Plankton pisar na bomba. Você pode continuar se movendo.', icons:['👁️','💣','💥'], text:'Bombas comuns explodem quando Plankton pisa e causam 1 de dano em um raio de 15 células. Você é imune à explosão; para Bob e Sandy, pisar na bomba conta como obstáculo. Patrick atravessa todas as bombas. Sua bomba especial atinge toda a arena e recarrega com 1 abate de outra fonte.'},
  {id:'frost', title:'Dez lanches: sopro gelado!', task:'Você já comeu 9 hambúrgueres no treino. Pegue o décimo!', icons:['🧽','❄️','👁️'], text:'A cada 10 hambúrgueres, o sopro congela por 3 segundos todos no cone até o último Plankton: 2 de dano no mais próximo e 1 nos demais. Você volta ao tamanho inicial. Na Batalha a velocidade base é constante. Sandy começa com 2 karatês; após gastá-los, cada 2 abates recuperam 1 uso, até 3. O golpe dá 2 de dano, paralisia e 3 segundos de imunidade.'}
];

function lessonImage(lesson) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 300 80');svg.setAttribute('role','img');svg.setAttribute('aria-label',lesson.title);
  const bg=document.createElementNS(svg.namespaceURI,'rect');bg.setAttribute('width','300');bg.setAttribute('height','80');bg.setAttribute('rx','12');bg.setAttribute('fill','#0b6287');svg.append(bg);
  lesson.icons.forEach((icon,index)=>{const text=document.createElementNS(svg.namespaceURI,'text');text.setAttribute('x',String(45+index*100));text.setAttribute('y','52');text.setAttribute('text-anchor','middle');text.setAttribute('font-size','34');text.setAttribute('fill','#c9faff');text.textContent=icon;svg.append(text);});
  return svg;
}
function restoreTutorialConfig(config) {
  character=config.character;difficulty=config.difficulty;gameMode=config.mode;
  updateCharacterChoices();updateBestDisplay();
  document.querySelectorAll('[data-mode]').forEach(button=>{const selected=button.dataset.mode===gameMode;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('.difficulty').forEach(button=>{const selected=button.dataset.difficulty===difficulty;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
}
function beginPlayableTutorial() {
  const config={character,difficulty,mode:'battle'};
  tutorialSelected=false;tutorialSlowdown=null;
  playableTutorial={stage:0,config,explained:false,final:false};
  character='bob';difficulty='easy';gameMode='battle';
  startGame({skipTutorial:true});
}
function prepareTutorialLesson(index) {
  const lesson=battleLessons[index];if(!lesson)return;
  playableTutorial.stage=index;playableTutorial.explained=false;playableTutorial.final=false;
  tutorialSlowdown=null;gameTime=0;score=0;battleKills=0;battleWave=index<3?1:2;scenePhase=0;obstaclePhase=0;
  powers={};abilityReadyAt=0;abilityHintKills=0;abilityHintReady=false;beam=null;frostBreath=null;bombExplosions=[];
  cheatFoods=[];battleEnemies=[];battlePendingSpawns=0;battleRewards=0;bossNextFood='normal';battleBurgers=index===4?9:0;
  snake=[{x:8,y:10},{x:7,y:10},{x:6,y:10},{x:5,y:10}];previousSnake=snake.map(p=>({...p}));
  direction={x:1,y:0};nextDirection=direction;directionQueue=[];inputMotion=null;lastVisualPositions=[];
  obstacles=[];food={x:11,y:10,type:index===2?'red':'normal',id:++foodSerial};previousFood={...food};
  if(index===1)food={x:COLS-3,y:ROWS-3,type:'normal',id:++foodSerial};
  const enemy=(x,y,hits=0)=>({x,y,hits,maxHealth:3,aggression:1,stunnedUntil:0,nextMoveAt:gameTime+600,motion:null});
  if(index===2)battleEnemies=[enemy(15,10,2)];
  if(index===3){obstacles=[{x:13,y:10,bomb:true}];battleEnemies=[enemy(16,10,2)];food={x:4,y:4,type:'normal',id:++foodSerial};}
  if(index===4)battleEnemies=[enemy(14,10),enemy(16,11)];
  sceneCacheKey='';currentSpeed=settings.easy.speed*(mobileGameplay?1.3:1);motionDuration=currentSpeed;lastMoveAt=performance.now();
  scoreEl.textContent='0';document.getElementById('level').textContent='Treino';
  document.getElementById('trainingObjective').hidden=false;document.getElementById('trainingObjective').textContent=lesson.task;
  updateStatus();draw();if(!paused)scheduleTick();
}
function triggerTutorialLesson(id) {
  if(!playableTutorial || playableTutorial.explained || tutorialSlowdown || battleLessons[playableTutorial.stage].id!==id)return;
  if(id==='waves'){battleWave=2;battleEnemies=[{x:15,y:7,hits:0,maxHealth:3,aggression:2,stunnedUntil:0,nextMoveAt:Infinity,motion:null}];}
  tutorialSlowdown={startedAt:performance.now(),duration:1100,base:currentSpeed};
}
function updateTutorialSlowdown(now) {
  if(!playableTutorial || !tutorialSlowdown || paused || over)return;
  const transition=tutorialSlowdown;
  const progress=Math.min(1,(now-transition.startedAt)/transition.duration);
  const fraction=movementProgress(now);
  currentSpeed=transition.base*(1+5*progress*progress);motionDuration=currentSpeed;lastMoveAt=now-fraction*motionDuration;
  scheduleTick();
  if(progress>=1){tutorialSlowdown=null;showPlayableLesson();}
}
function showPlayableLesson() {
  if(!playableTutorial)return;
  playableTutorial.explained=true;if(!paused)togglePause();
  const lesson=battleLessons[playableTutorial.stage];
  document.getElementById('overlayTitle').textContent=lesson.title;
  const paragraph=document.createElement('p');paragraph.textContent=lesson.text;
  document.getElementById('overlayText').replaceChildren(lessonImage(lesson),paragraph);
  document.getElementById('resumeBtn').textContent=playableTutorial.stage===battleLessons.length-1?'CONCLUIR TREINO':'PRATICAR PRÓXIMO PASSO';
}
function advancePlayableTutorial() {
  if(!playableTutorial || !playableTutorial.explained)return false;
  if(playableTutorial.final){
    const config=playableTutorial.config;playableTutorial=null;tutorialSlowdown=null;
    localStorage.setItem('bobSnakeBattlePlayableTutorialSeen','true');
    document.getElementById('trainingObjective').hidden=true;document.getElementById('resumeBtn').textContent='CONTINUAR';
    restoreTutorialConfig(config);startGame({skipTutorial:true});return true;
  }
  if(playableTutorial.stage===battleLessons.length-1){
    playableTutorial.final=true;
    document.getElementById('overlayTitle').textContent='Agora é pra valer!';
    document.getElementById('overlayText').textContent='Treino concluído! Sua partida começa do zero, com o personagem e a dificuldade que você escolheu.';
    document.getElementById('resumeBtn').textContent='JOGAR DE VERDADE';return true;
  }
  const next=playableTutorial.stage+1;
  playableTutorial.advancing=true;togglePause();playableTutorial.advancing=false;clearTimeout(timer);prepareTutorialLesson(next);
  document.getElementById('resumeBtn').textContent='CONTINUAR';return true;
}
function abortPlayableTutorial() {
  if(!playableTutorial)return;
  const config=playableTutorial.config;playableTutorial=null;tutorialSlowdown=null;tutorialSelected=false;game.classList.remove('tutorial-mode');
  document.getElementById('trainingObjective').hidden=true;document.getElementById('resumeBtn').textContent='CONTINUAR';restoreTutorialConfig(config);
}
function updateTutorialEnemies() {
  if(!playableTutorial || playableTutorial.stage!==3 || playableTutorial.explained || tutorialSlowdown)return;
  const enemy=battleEnemies[0];if(!enemy || gameTime<enemy.nextMoveAt)return;
  enemy.x--;enemy.nextMoveAt=gameTime+600;
  const bomb=obstacles.find(o=>o.bomb && same(o,enemy));if(bomb)explodeBomb(bomb);
}
function selectPlayableTutorial() {
  if(gameMode!=='battle')return;
  tutorialSelected=true;updateCharacterChoices();updateBestDisplay();
  document.querySelectorAll('[data-mode]').forEach(button=>{const selected=button.dataset.mode==='battle';button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('.difficulty').forEach(button=>{const selected=button.id==='tutorialDifficultyBtn';button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  document.getElementById('tutorialPreview').classList.remove('hidden');document.getElementById('tutorialMenuBtn').setAttribute('aria-expanded','true');
}
const cards=document.getElementById('tutorialCards');
for(const lesson of battleLessons){const card=document.createElement('article');const title=document.createElement('h3');title.textContent=lesson.title;const text=document.createElement('p');text.textContent=lesson.text;card.append(title,lessonImage(lesson),text);cards.append(card);}
document.getElementById('tutorialMenuBtn').addEventListener('click',selectPlayableTutorial);
document.getElementById('tutorialDifficultyBtn').addEventListener('click',selectPlayableTutorial);
document.getElementById('startTutorialBtn').addEventListener('click',()=>{if(gameMode==='battle')beginPlayableTutorial();});
