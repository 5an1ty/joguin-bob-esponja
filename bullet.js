// Bullet Hell: clocks use gameTime so pause freezes hazards, warnings and shots.
const bulletState={phase:1,progress:0,immunityCount:0,nextFood:'green',bonusFoods:[],mainFood:null,enemies:[],hazards:[],shots:[],profile:null,nextCannon:0,nextRespawn:0,bossDefeated:false,phasePending:false,best:Number(localStorage.getItem('bobSnakeBulletBest')||0),noticeUntil:0};
let dutchUnlocked=localStorage.getItem('bobSnakeDutchUnlocked')==='true';
let dutchProjectiles=[];
const DUTCH_BOSS_HEALTH=10;
function bulletGoal(phase){return phase<=4?5:phase<=7?8:10;}
function bulletProfile(phase){
  const level=phase===11?10:phase;
  const scale=Math.pow(.94,level-1);
  return {snakeSpeed:Math.max(55,settings[difficulty].speed*scale),enemyInterval:Math.max(phase===11?420:150,settings[difficulty].bossInterval*scale),shotSpeed:Math.min(15,5+level*.35),cannonDelay:Math.max(780,3200-level*165)*(phase===11?1.2:1),maxCannons:Math.max(1,Math.min(12,Math.ceil(level/2))-(phase===11?1:0)),count:Math.min(10,1+Math.floor(level/2)),obstacles:Math.min(Math.floor(COLS*ROWS*.17),level<3?3:5+(level-3)*4)};
}
function updateDutchChoice(){
  const card=document.querySelector('[data-character=dutch]');if(!card)return;
  card.disabled=!dutchUnlocked;
  card.setAttribute('aria-label',dutchUnlocked?'Holandês Voador: incorpóreo, tiro a cada 15 segundos':'Holandês Voador, em breve. Derrote o chefe da fase 11 no Bullet Hell para desbloquear.');
  card.querySelector('small').textContent=dutchUnlocked?'Incorpóreo · Tiro 15s':'Em breve';
  card.title=dutchUnlocked?'Atravesse o próprio corpo. O tiro destrói obstáculos e causa 1 de dano.':'Derrote o Holandês na fase 11 do Bullet Hell.';
}
function updateBulletRecord(){
  if(score>bulletState.best){bulletState.best=score;localStorage.setItem('bobSnakeBulletBest',String(score));}
  updateBestDisplay();
}
function startBulletMode(){
  bulletState.phase=1;bulletState.progress=0;bulletState.immunityCount=0;bulletState.enemies=[];bulletState.hazards=[];bulletState.shots=[];bulletState.phasePending=false;bulletState.bossDefeated=false;
  beginBulletPhase(1);
}
function safeBulletSpawn(minDistance=5){
  const cells=[];
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const p={x,y};
    if(torusDistance(p,snake[0])>=minDistance && !snake.some(s=>same(s,p)) && !obstacles.some(s=>same(s,p)) && !bulletState.enemies.some(s=>same(s,p)) && !mapFoods().some(s=>same(s,p)) && !foodUnderMobileControls(p))cells.push(p);
  }
  return cells.length?cells[Math.floor(Math.random()*cells.length)]:null;
}
function createBulletEnemy(index,kind='plankton'){
  const pos=safeBulletSpawn(kind==='dutch'?7:5);if(!pos)return null;
  const phase=bulletState.phase;
  const aggression=kind==='dutch'?4:phase>=7 && index%3===0?3:phase>=5 && index%3!==2?2:1;
  const enemy={...pos,id:++battleEnemyId,kind,aggression,hits:0,maxHealth:kind==='dutch'?DUTCH_BOSS_HEALTH:battleHealth(Math.min(phase,10),aggression),stunnedUntil:0,motion:null,nextMoveAt:gameTime+bulletState.profile.enemyInterval,shootAt:gameTime+2000,windup:null};
  bulletState.enemies.push(enemy);return enemy;
}
function beginBulletPhase(phase){
  bulletState.phase=phase;bulletState.progress=0;bulletState.immunityCount=0;bulletState.profile=bulletProfile(phase);bulletState.phasePending=false;
  bulletState.enemies=[];bulletState.hazards=[];bulletState.shots=[];bulletState.nextFood='green';
  bulletState.nextCannon=gameTime+1500;bulletState.nextRespawn=gameTime+6500;bulletState.noticeUntil=gameTime+1800;
  bulletState.bonusFoods=[];bulletState.mainFood=null;
  scenePhase=phase-1;obstaclePhase=phase-1;obstacles=[];
  generateObstacles(bulletState.profile.obstacles);
  for(let i=0;i<bulletState.profile.count;i++)createBulletEnemy(i);
  if(phase===11)createBulletEnemy(0,'dutch');
  sceneCacheKey='';refreshSpeed();
}
function chooseBulletFood(){return bulletState.nextFood;}
function collectBulletFood(){
  burgerIntroActive=false;
  const eaten={...food},type=eaten.type||'normal';
  const bonus=bulletState.bonusFoods.some(f=>f.id===eaten.id);
  if(bonus){bulletState.bonusFoods=bulletState.bonusFoods.filter(f=>f.id!==eaten.id);food=bulletState.mainFood;}
  playEffect(type==='normal'?'collect':type==='green'?'collect':type);
  if(foodTypes[type]?.duration && (hasPower(type)||activePowerTypes().length<MAX_ACTIVE_POWERS))powers[type]=gameTime+foodTypes[type].duration;
  refreshSpeed();
  if(type==='red'){
    const target=laserTarget();
    if(target){beam={from:{...snake[0]},to:{...target},until:gameTime+400};playEffect('laser');damageBulletEnemy(target,1,3000);}
  }
  if(type==='green')emitFourShots(eaten,'green');
  if(!bonus)bulletState.nextFood='green';
  bulletState.immunityCount++;
  if(bulletState.immunityCount>=3){bulletState.immunityCount=0;powers.immunity=gameTime+3000;playEffect('super');}
  if(type==='green')bulletState.progress++;
  addScore(10);
  if(++battleBurgers>=10){battleBurgers=0;releaseFrostBreath();}
  if(bulletState.phase<=10 && bulletState.progress>=bulletGoal(bulletState.phase) || bulletState.phase>11 && bulletState.progress>=bulletGoal(bulletState.phase))bulletState.phasePending=true;
  const advanced=advanceBulletIfReady();
  return bonus && !advanced ? true : placeFood();
}
function advanceBulletIfReady(){
  if(!bulletState.phasePending)return false;
  beginBulletPhase(bulletState.phase+1);return true;
}
function damageBulletEnemy(enemy,damage,stun=3000,source='normal'){
  if(!bulletState.enemies.includes(enemy))return;
  enemy.hits=Math.min(enemy.maxHealth,enemy.hits+damage);
  // The boss has a shorter stun than a red Plankton and keeps its attack rhythm.
  if(stun){enemy.stunnedUntil=gameTime+(enemy.kind==='dutch'?Math.min(600,stun):stun);enemy.nextMoveAt=enemy.stunnedUntil+enemyInterval(enemy);}
  if(enemy.kind==='dutch' && enemy.hits<enemy.maxHealth && enemy.maxHealth-enemy.hits<=3 && !enemy.barrage){
    enemy.barrage={deployAt:gameTime+1000,deployed:false};playEffect('barrageWarning');
  }
  if(enemy.hits<enemy.maxHealth)return;
  bulletState.enemies=bulletState.enemies.filter(e=>e!==enemy);battleKills++;
  if(source!=='patrick')patrickCharge=Math.min(1,patrickCharge+1);
  if(character==='sandy' && sandyRechargeUnlocked && sandyUses<3 && ++sandyRechargeKills>=2){sandyUses++;sandyRechargeKills=0;}
  addScore(enemy.kind==='dutch'?500:50);
  if(enemy.kind==='dutch'){
    dutchUnlocked=true;localStorage.setItem('bobSnakeDutchUnlocked','true');updateDutchChoice();
    bulletState.bossDefeated=true;bulletState.phasePending=true;
    bulletState.noticeUntil=gameTime+4000;
    // Phase 11 is won by defeating the boss; no green-food quota is required.
  }
}
function emitFourShots(origin,owner,speedScale=1){
  for(const d of steps)bulletState.shots.push({x:origin.x,y:origin.y,px:origin.x,py:origin.y,dx:d.x,dy:d.y,owner,speed:bulletState.profile.shotSpeed*speedScale,lastAt:gameTime,until:gameTime+7000});
}
function spawnCannonShadow(){
  const pos=safeBulletSpawn(3);if(!pos)return;
  if(bulletState.hazards.some(h=>same(h,pos)))return;
  bulletState.hazards.push({...pos,stage:'shadow',startedAt:gameTime,impactAt:gameTime+1000,fireAt:gameTime+1350});
  playEffect('cannonFall');
}
function deployBossBarrage(enemy){
  // A complete, telegraphed row, placed away from the player; staggered impacts leave escape time.
  const row=(snake[0].y+Math.floor(ROWS/2))%ROWS;
  for(let x=0;x<COLS;x++)bulletState.hazards.push({x,y:row,stage:'shadow',barrage:true,startedAt:gameTime,impactAt:gameTime+2000+x*65,fireAt:gameTime+2700+x*65});
  enemy.barrage.deployed=true;playEffect('cannonFall');
}
function updateBulletMode(){
  // Finish the current attack before replacing the phase's enemies and projectiles.
  if(bulletState.phasePending){advanceBulletIfReady();placeFood();}
  for(const enemy of [...bulletState.enemies]){
    if(!bulletState.enemies.includes(enemy))continue;
    if(same(enemy,snake[0]) && !resolveEnemyContact(enemy)){endGame();return;}
    if(!bulletState.enemies.includes(enemy))continue;
    if(enemy.kind==='dutch'){
      if(enemy.barrage && !enemy.barrage.deployed && gameTime>=enemy.barrage.deployAt)deployBossBarrage(enemy);
      if(enemy.windup && gameTime>=enemy.windup.fireAt){
        const dx=snake[0].x-enemy.x,dy=snake[0].y-enemy.y,length=Math.hypot(dx,dy)||1;
        bulletState.shots.push({x:enemy.x,y:enemy.y,px:enemy.x,py:enemy.y,dx:dx/length,dy:dy/length,owner:'boss',speed:bulletState.profile.shotSpeed+2,lastAt:gameTime,until:gameTime+6000});
        enemy.windup=null;enemy.shootAt=gameTime+Math.max(1500,3000-(bulletState.phase-10)*70);playEffect('dutchShot');
      }else if(!enemy.windup && gameTime>=enemy.shootAt){
        enemy.windup={startedAt:gameTime,fireAt:gameTime+900};playEffect('cannonWarning');
      }
    }
    if(enemy.stunnedUntil>gameTime || enemy.frozenUntil>gameTime)continue;
    const from={x:enemy.x,y:enemy.y};let moved=false;
    for(let i=0;i<4 && gameTime>=enemy.nextMoveAt;i++){
      const moves=steps.map(d=>wrap({x:enemy.x+d.x,y:enemy.y+d.y})).filter(p=>!bulletState.enemies.some(other=>other!==enemy && same(p,other)));
      moves.sort((a,b)=>torusDistance(a,snake[0])-torusDistance(b,snake[0]));
      if(moves.length){Object.assign(enemy,moves[0]);moved=true;}
      enemy.nextMoveAt+=enemyInterval(enemy);
      const bomb=obstacles.find(o=>o.bomb && same(o,enemy));if(bomb)explodeBomb(bomb);
      if(!bulletState.enemies.includes(enemy))break;
      if(same(enemy,snake[0]) && !resolveEnemyContact(enemy)){endGame();return;}
    }
    if(moved)enemy.motion={from,startedAt:performance.now(),duration:Math.min(currentSpeed,enemyInterval(enemy))};
  }
  if(gameTime>=bulletState.nextRespawn){
    const regular=bulletState.enemies.filter(e=>e.kind!=='dutch').length;
    for(let i=regular;i<bulletState.profile.count;i++)createBulletEnemy(i);
    bulletState.nextRespawn=gameTime+6500;
  }
  if(gameTime>=bulletState.nextCannon && bulletState.hazards.length<bulletState.profile.maxCannons){spawnCannonShadow();bulletState.nextCannon=gameTime+bulletState.profile.cannonDelay;}
  for(const hazard of bulletState.hazards){
    if(gameTime>=hazard.fireAt){emitFourShots(hazard,'cannon',hazard.barrage?.65:1);hazard.stage='spent';playEffect('cannonBurst');}
    else if(gameTime>=hazard.impactAt)hazard.stage='bomb';
  }
  bulletState.hazards=bulletState.hazards.filter(h=>h.stage!=='spent');
  updateShotList(bulletState.shots);
  bulletState.shots=bulletState.shots.filter(s=>!s.dead);
  if(advanceBulletIfReady())placeFood();
}
function segmentDistance(point,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/len)):0;
  return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
}
function updateShotList(shots){
  for(const shot of shots){
    if(shot.dead)continue;
    const dt=Math.max(0,(gameTime-shot.lastAt)/1000);shot.lastAt=gameTime;
    shot.px=shot.x;shot.py=shot.y;shot.x+=shot.dx*shot.speed*dt;shot.y+=shot.dy*shot.speed*dt;
    if(gameTime>=shot.until){shot.dead=true;continue;}
    const a={x:shot.px,y:shot.py},b=shot;
    if(shot.owner==='green' || shot.owner==='dutch'){
      const hits=activeEnemies().filter(enemy=>segmentDistance(enemy,a,b)<.65).map(enemy=>({enemy,d:Math.hypot(enemy.x-a.x,enemy.y-a.y)}));
      const rocks=shot.owner==='dutch'?obstacles.filter(rock=>segmentDistance(rock,a,b)<.65).map(rock=>({rock,d:Math.hypot(rock.x-a.x,rock.y-a.y)})):[];
      if(shot.owner==='green'){
        // Remember enemy objects so overlapping frames cannot damage the same target twice.
        shot.hitEnemies ??= new Set();
        for(const {enemy} of hits.sort((x,y)=>x.d-y.d)){
          if(shot.hitEnemies.has(enemy))continue;
          shot.hitEnemies.add(enemy);
          damageBattleEnemy(enemy,enemy.kind==='dutch'?1:2,0);
          if(enemy.kind==='dutch'){shot.dead=true;break;}
        }
      }
      const first=shot.owner==='green'?null:[...hits,...rocks].sort((x,y)=>x.d-y.d)[0];
      if(first){
        if(first.rock){obstacles=obstacles.filter(o=>o!==first.rock);sceneCacheKey='';}
        else if(gameMode==='classic' && first.enemy===plankton){
          plankton.hits++;if(plankton.hits>=enemyMaxHealth(plankton)){plankton=null;addScore(50);}
        }else damageBattleEnemy(first.enemy,shot.owner==='green' && first.enemy.kind!=='dutch'?2:1,0);
        shot.dead=true;
      }
    }else if(segmentDistance(snake[0],a,b)<.6){
      if(!isInvulnerable())endGame();shot.dead=true;
    }
    if(shot.x<-.6 || shot.y<-.6 || shot.x>COLS-.4 || shot.y>ROWS-.4)shot.dead=true;
  }
}
function resetDutchProjectiles(){dutchProjectiles=[];}
function useDutchAbility(){
  if(!dutchUnlocked || abilityReadyAt>gameTime)return false;
  const head=snake[0];
  dutchProjectiles.push({x:head.x,y:head.y,px:head.x,py:head.y,dx:direction.x,dy:direction.y,owner:'dutch',speed:10,lastAt:gameTime,until:gameTime+7000});
  abilityReadyAt=gameTime+15000;playEffect('dutchShot');updateStatus();return true;
}
function updateDutchProjectiles(){
  updateShotList(dutchProjectiles);dutchProjectiles=dutchProjectiles.filter(s=>!s.dead);
}
function updateBulletHud(){
  const goal=bulletGoal(bulletState.phase);
  document.getElementById('level').textContent=String(bulletState.phase);
  const boss=bulletState.enemies.find(e=>e.kind==='dutch');
  bossHealth.hidden=!boss;
  if(boss){bossHealth.max=boss.maxHealth;bossHealth.value=boss.maxHealth-boss.hits;bossHealth.setAttribute('aria-label','Vida do Holandês Voador');}
  const bossPhase=bulletState.phase===11;
  const shield=bulletState.immunityCount;
  bossStatus.textContent=bossPhase?`Chefe ${boss?boss.maxHealth-boss.hits:0}/10 - escudo ${shield}/3`:`${bulletState.progress}/${goal} - escudo ${shield}/3`;
  bossStatus.title=bossPhase?`Fase 11 · ${bulletState.progress} hambúrgueres verdes · Vença derrotando o Holandês`:`Fase ${bulletState.phase} · Hambúrgueres para avançar`;
  const bars=document.getElementById('bulletProgressHud');
  bars.hidden=false;
  const phaseBar=document.getElementById('bulletPhaseProgress'),shieldBar=document.getElementById('bulletShieldProgress');
  phaseBar.max=bossPhase?10:goal;phaseBar.value=bossPhase?(boss?boss.hits:10):bulletState.progress;
  phaseBar.setAttribute('aria-label',bossPhase?'Dano causado ao chefe':'Hambúrgueres coletados na fase');
  shieldBar.value=shield;shieldBar.setAttribute('aria-label',`Escudo: ${shield} de 3 hambúrgueres`);
  const notice=document.getElementById('bulletNotice');
  if(notice){
    notice.hidden=bulletState.noticeUntil<=gameTime;
    notice.textContent=bulletState.bossDefeated && bulletState.phase===12?'Holandês desbloqueado! O desafio infinito começou.':bulletState.phase===11?'O Holandês Voador chegou! Derrote o chefe.':`Fase ${bulletState.phase} · ${goal} hambúrgueres verdes para avançar`;
  }
}
function drawDutchSprite(x,y,head=true){
  ctx.save();ctx.translate(x,y);ctx.shadowColor='#69ffd1';ctx.shadowBlur=head?7:3;
  ctx.fillStyle=head?'#64edb2':'#3dcf9d';
  ctx.beginPath();ctx.moveTo(2,7);ctx.quadraticCurveTo(10,-2,18,7);ctx.lineTo(18,18);ctx.lineTo(13,15);ctx.lineTo(10,20);ctx.lineTo(6,16);ctx.lineTo(2,19);ctx.closePath();ctx.fill();
  if(head){
    ctx.fillStyle='#174944';ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(5,0);ctx.lineTo(10,3);ctx.lineTo(16,0);ctx.lineTo(20,6);ctx.closePath();ctx.fill();
    ctx.fillStyle='#efffc5';ctx.fillRect(5,8,4,3);ctx.fillRect(12,8,4,3);ctx.fillStyle='#0a3241';ctx.fillRect(7,8,2,3);ctx.fillRect(12,8,2,3);
    ctx.strokeStyle='#f3ffe0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(5,13);ctx.quadraticCurveTo(10,18,16,12);ctx.stroke();
  }
  ctx.restore();
}
function drawDutchEnemy(enemy,now){
  const motion=enemy.motion;
  const alpha=!paused && !over && motion?Math.min(1,(now-motion.startedAt)/motion.duration):1;
  const position=interpolateCell(motion?.from||enemy,enemy,alpha);
  paintWrapped(position,(x,y)=>{
    ctx.save();ctx.translate(x-5,y-6);ctx.scale(1.5,1.5);drawDutchSprite(0,0,true);
    if(enemy.windup){
      const visualTime=gameTime+(!paused&&!over?movementProgress(now)*motionDuration:0);
      const fraction=Math.min(1,(visualTime-enemy.windup.startedAt)/900);
      const angle=Math.atan2(snake[0].y-enemy.y,snake[0].x-enemy.x);
      ctx.save();ctx.translate(10,13);ctx.rotate(angle);
      ctx.strokeStyle='#ffe66d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(5+10*fraction,0);ctx.stroke();
      ctx.fillStyle='#17353c';ctx.fillRect(4+9*fraction,-3,10,5);ctx.restore();
      ctx.fillStyle='#fff598';ctx.font='bold 12px sans-serif';ctx.fillText('!',22,3);
    }
    ctx.fillStyle='#042c3c';ctx.fillRect(-1,-7,24,4);ctx.fillStyle='#69ffc1';ctx.fillRect(0,-6,22*Math.max(0,enemy.maxHealth-enemy.hits)/enemy.maxHealth,2);
    ctx.restore();
  });
}
function drawBulletWorld(alpha=1,now=performance.now()){
  if(gameMode==='bullet'){
    if(hasPower('immunity') && snake.length){
      const head=getVisualHead(alpha,now);
      ctx.save();ctx.strokeStyle='#a8fff0';ctx.fillStyle='#78f2d51c';ctx.lineWidth=2;ctx.shadowColor='#a8fff0';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(head.x*CELL+10,head.y*CELL+10,13,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    }
    for(const h of bulletState.hazards){
      const x=h.x*CELL+10,y=h.y*CELL+10,progress=Math.min(1,(gameTime-h.startedAt)/(h.impactAt-h.startedAt));
      ctx.save();ctx.fillStyle=`rgba(0,10,35,${.2+progress*.45})`;ctx.beginPath();ctx.ellipse(x,y,4+6*progress,3+4*progress,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffd57a';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      if(h.stage==='bomb'){drawBomb(x-10,y-10);}
      else{ctx.fillStyle='#29384f';ctx.beginPath();ctx.arc(x,y-25*(1-progress),5,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    for(const shot of bulletState.shots)drawBulletShot(shot,alpha,now);
  }
  for(const shot of dutchProjectiles)drawBulletShot(shot,alpha,now);
}
function drawBulletShot(shot,alpha,now){
  const x=(shot.px+(shot.x-shot.px)*alpha)*CELL+10,y=(shot.py+(shot.y-shot.py)*alpha)*CELL+10;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(shot.dy,shot.dx));
  const friendly=shot.owner==='green'||shot.owner==='dutch';
  ctx.strokeStyle=friendly?'#c4ffe1':'#ffc9a2';ctx.fillStyle=friendly?'#47eb9c':shot.owner==='boss'?'#6bf5be':'#f16e44';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;
  ctx.globalAlpha=.45;ctx.beginPath();ctx.ellipse(-5,0,7+2*Math.sin(gameTime/80),3,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(-1,-2,2,2);ctx.restore();
}
const bulletNotice=document.createElement('div');bulletNotice.id='bulletNotice';bulletNotice.hidden=true;bulletNotice.setAttribute('role','status');game.append(bulletNotice);
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  document.getElementById('bulletModeDescription').classList.toggle('hidden',gameMode!=='bullet');
  bulletNotice.hidden=true;
}));
updateDutchChoice();
function reflowBulletWorld(){
  // Rotation discards shots and telegraphs instead of teleporting them into the player.
  dutchProjectiles=[];
  if(gameMode==='bullet'){
    bulletState.shots=[];bulletState.hazards=[];bulletState.nextCannon=gameTime+1500;
    for(const enemy of bulletState.enemies)if(enemy.barrage)enemy.barrage.deployed=true;
    if(bulletState.bonusFoods.length){bulletState.bonusFoods=[];if(character==='bob')abilityReadyAt=gameTime;}
    updateBulletHud();
  }
}
