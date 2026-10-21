// Guia de gesto independente da fase: desacelera e devolve o ritmo sem reiniciar.
let movementGuide = null;
function movementGuideSpeed(){return movementGuide ? movementGuide.factor : 1;}
function stopMovementGuide(){movementGuide=null;document.getElementById('movementGuide')?.remove();}
function beginMovementGuide(){
  if(localStorage.getItem('bobSnakeDragLearned')==='true' || (playableTutorial && !(playableTutorial.stage===0 && playableTutorial.lessonPhase==='practice')))return;
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
  top.textContent=over?'↻':paused?'▶':'Ⅱ';
  top.setAttribute('aria-label',over?'Jogar novamente':paused?'Retomar jogo':'Pausar jogo');
}
// A habilidade pronta é indicada por estado real, incluindo alterações de recarga.
const abilityButton=document.getElementById('abilityBtn');
new MutationObserver(()=>{
  abilityButton.classList.toggle('ability-ready',!abilityButton.hidden && !abilityButton.disabled);
}).observe(abilityButton,{attributes:true,attributeFilter:['disabled','hidden']});
