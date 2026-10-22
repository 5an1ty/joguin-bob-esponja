"""Regressões reais do Bullet Hell e do personagem desbloqueável."""
import unittest
from tests import test_game


class BulletHellTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check

    def start_bullet(self):
        self.page.evaluate("goMenu();gameMode='bullet';startGame({skipTutorial:true});clearTimeout(timer);stopMovementGuide()")

    def test_phase_quotas_speed_only_on_phase_change_and_enemy_profiles(self):
        self.start_bullet()
        self.check("""
          const classicBest=best,battleRecord=battleBest;
          for(let phase=1;phase<=10;phase++){
            assert(bulletState.phase===phase,'phase '+phase);
            const expected=phase<=4?5:phase<=7?8:10;
            assert(bulletGoal(phase)===expected,'quota '+phase);
            assert(obstacles.length>0,'scenario obstacles from phase 1');
            if(phase>=3)assert(obstacles.length>0,'more rocks from 3');
            const colors=bulletState.enemies.map(e=>e.aggression);
            if(phase<=4)assert(colors.every(c=>c===1),'normal enemies early');
            if(phase>=5)assert(colors.includes(2),'orange from 5');
            if(phase>=7)assert(colors.includes(3),'red from 7');
            const speed=currentSpeed,interval=bulletState.profile.enemyInterval;
            for(let i=0;i<expected;i++){
              food={...snake[0],type:chooseBulletFood(),id:++foodSerial};bulletState.mainFood=food;
              assert(collectFood(),'food placed');clearTimeout(timer);
              if(i<expected-1)assert(bulletState.phase===phase && currentSpeed===speed && bulletState.profile.enemyInterval===interval,'no food speed increase');
            }
            assert(bulletState.phase===phase+1 && bulletState.immunityCount===0,'phase transition resets immunity count');
          }
          assert(bulletState.phase===11 && bulletState.enemies.some(e=>e.kind==='dutch'),'boss phase');
          assert(bulletProfile(11).maxCannons<bulletProfile(10).maxCannons && bulletProfile(11).cannonDelay>bulletProfile(10).cannonDelay,'boss hazard reduction');
          assert(best===classicBest && battleBest===battleRecord,'separate records');
          assert(selectedMusicKey()==='bgm_bullet_boss','boss music');
        """)

    def test_blocked_food_refresh_uses_current_phase_obstacle_density(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);bulletState.enemies=[];
          obstacles=steps.map(d=>wrap({x:snake[0].x+d.x,y:snake[0].y+d.y}));
          assert(placeFood() && food && !over,'blocked board recovers');
          assert(obstacles.length===bulletState.profile.obstacles,'recovery respects phase density');
          powers={immunity:gameTime+3000};draw();
        """)

    def test_immunity_every_three_foods_and_bob_bonus_keeps_main_sequence(self):
        self.start_bullet()
        self.check("""
          const eat=()=>{food={...snake[0],type:chooseBulletFood(),id:++foodSerial};bulletState.mainFood=food;collectFood();clearTimeout(timer);};
          eat();eat();assert(!hasPower('immunity'),'no early shield');
          eat();assert(powers.immunity===gameTime+3000 && isInvulnerable(),'three second shield');
          gameTime=powers.immunity+1;assert(!isInvulnerable(),'shield expires');
          beginBulletPhase(11);placeFood();obstacles=[];
          const speed=currentSpeed,main=food,next=bulletState.nextFood,enemyPace=bulletState.profile.enemyInterval;
          abilityReadyAt=0;assert(useAbility(),'Bob works');
          assert(food===main && bulletState.nextFood===next && mapFoods().length===2,'bonus does not replace primary');
          const progress=bulletState.progress;
          food=bulletState.bonusFoods[0];collectFood();refreshSpeed();
          assert(food===main && bulletState.nextFood===next && currentSpeed===Math.max(25,bulletState.profile.snakeSpeed*.55)*(mobileGameplay?1.3:1),'yellow immunity and turbo preserve main food');
          assert(isInvulnerable() && powers.super===gameTime+foodTypes.super.duration,'yellow grants immunity for configured duration');
          assert(bulletState.progress===progress,'yellow never progresses phase');
          assert(bulletState.profile.enemyInterval===enemyPace,'yellow accelerates player only');
          gameTime=powers.super;refreshSpeed();
          assert(!hasPower('super') && currentSpeed===speed,'immunity and turbo expire together');
        """)

    def test_strict_green_red_alternation_boss_bonus_and_infinite_transitions(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);placeFood();obstacles=[];
          for(let i=0;i<8;i++){
            const type=i%2===0?'green':'red';assert(food.type===type,'strict alternation '+i);
            food={...snake[0],type,id:++foodSerial};bulletState.mainFood=food;
            collectFood();clearTimeout(timer);
            assert(bulletState.progress===Math.floor(i/2)+1,'only green counts');
            assert(bulletState.phase===11,'food alone does not win boss phase');
            if(i===0){
              const main=food;
              abilityReadyAt=0;assert(useAbility(),'Bob creates yellow bonus');
              food=bulletState.bonusFoods[0];collectFood();
              assert(food===main && food.type==='red' && chooseBulletFood()==='red','yellow never consumes alternating main spawn');
              assert(bulletState.progress===1,'yellow does not progress');
            }
          }
          assert(bulletState.shots.filter(s=>s.owner==='green').length===16,'four shots per collected green');
          beginBulletPhase(12);placeFood();
          for(let i=0;i<40;i++){
            const type=i%2===0?'green':'red';assert(food.type===type,'alternation survives infinite phase changes '+i);
            food={...snake[0],type,id:++foodSerial};bulletState.mainFood=food;
            collectFood();clearTimeout(timer);
          }
          assert(bulletState.phase===14,'only greens advance infinite phases');
        """)

    def test_cannon_shadow_impact_and_four_fragments(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);bulletState.enemies=[];spawnCannonShadow();
          const h=bulletState.hazards[0];assert(h && h.stage==='shadow','shadow is visible first');
          bulletState.nextCannon=Infinity;bulletState.nextRespawn=Infinity;
          gameTime=h.impactAt-1;updateBulletMode();assert(h.stage==='shadow' && bulletState.shots.length===0,'warning window');
          gameTime=h.impactAt;updateBulletMode();assert(h.stage==='bomb' && bulletState.shots.length===0,'impact arms bomb');
          gameTime=h.fireAt;updateBulletMode();assert(bulletState.hazards.length===0,'bomb consumed');
          const shots=bulletState.shots.filter(s=>s.owner==='cannon');
          assert(shots.length===4 && new Set(shots.map(s=>s.dx+','+s.dy)).size===4,'four cardinal fragments');
          draw();
        """)

    def test_green_damage_and_boss_warning_then_aimed_shot(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);obstacles=[];
          const normal={x:7,y:5,kind:'plankton',aggression:1,hits:0,maxHealth:5,stunnedUntil:0,nextMoveAt:Infinity};
          const boss={x:5,y:3,kind:'dutch',aggression:4,hits:0,maxHealth:10,stunnedUntil:0,nextMoveAt:Infinity,shootAt:Infinity,windup:null};
          bulletState.enemies=[normal,boss];bulletState.shots=[];emitFourShots({x:5,y:5},'green');
          gameTime+=300;updateShotList(bulletState.shots);
          assert(normal.hits===2 && boss.hits===1,'green damage differentiates boss');
          const events=[],original=playEffect;playEffect=k=>events.push(k);
          try{
            bulletState.shots=[];bulletState.nextCannon=Infinity;bulletState.nextRespawn=Infinity;boss.shootAt=gameTime;
            updateBulletMode();assert(boss.windup && events.includes('cannonWarning') && !bulletState.shots.length,'draw gun and warn before shooting');
            const fireAt=boss.windup.fireAt;gameTime=fireAt-1;updateBulletMode();assert(!bulletState.shots.length,'no early shot');
            draw();gameTime=fireAt;updateBulletMode();
            assert(!boss.windup && bulletState.shots.some(s=>s.owner==='boss'),'aimed animated projectile');
            assert(enemyInterval(boss)<enemyInterval({...normal,aggression:3}),'boss more aggressive than red');
          }finally{playEffect=original;}
        """)

    def test_victory_only_requires_boss_and_unlock_survives_reload(self):
        self.start_bullet()
        self.assertTrue(self.page.locator('[data-character=dutch]').is_disabled())
        self.check("""
          beginBulletPhase(11);placeFood();
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');
          assert(bulletState.progress===0,'no green quota collected');
          damageBulletEnemy(boss,DUTCH_BOSS_HEALTH,0);
          assert(dutchUnlocked && localStorage.getItem('bobSnakeDutchUnlocked')==='true','unlock stored');
          updateBulletMode();assert(bulletState.phase===12 && food.type==='green','infinite starts after boss alone');
          assert(selectedMusicKey()==='bgm_bullet_mode','normal music in infinite');
        """)
        self.page.reload(wait_until='domcontentloaded')
        self.assertFalse(self.page.locator('[data-character=dutch]').is_disabled())
        self.assertIn('Incorpóreo',self.page.locator('[data-character=dutch] small').inner_text())
        self.page.locator('[data-character=dutch]').click()
        self.assertTrue(self.page.evaluate("character==='dutch' && gameMode==='classic'"))

    def test_dutch_passive_projectile_obstacle_damage_and_cooldown(self):
        self.check("""
          dutchUnlocked=true;character='dutch';gameMode='classic';startGame({skipTutorial:true});clearTimeout(timer);
          snake=[{x:5,y:5},{x:6,y:5},{x:6,y:6},{x:5,y:6}];previousSnake=snake.map(p=>({...p}));
          direction=nextDirection={x:1,y:0};obstacles=[];food={x:20,y:15,type:'normal'};powers={};tick();
          assert(!over && snake[0].x===6,'passive passes through own body');
          obstacles=[{x:8,y:5}];plankton={x:10,y:5,hits:0,stunnedUntil:0};abilityReadyAt=0;
          assert(useAbility() && abilityReadyAt===gameTime+15000 && !useAbility(),'15 second cooldown');
          gameTime+=300;updateDutchProjectiles();assert(!obstacles.length && plankton.hits===0,'first impact destroys obstacle');
          gameTime=abilityReadyAt;assert(useAbility(),'ready after 15 seconds');
          gameTime+=400;updateDutchProjectiles();assert(plankton.hits===1,'one damage to Plankton');
          draw();
        """)

    def test_cannon_fragments_damage_player_and_immunity_blocks_damage(self):
        self.start_bullet()
        self.check("""
          const shoot=()=>{
            bulletState.shots=[{x:snake[0].x-2,y:snake[0].y,px:snake[0].x-2,py:snake[0].y,dx:1,dy:0,owner:'cannon',speed:10,lastAt:gameTime,until:gameTime+7000}];
            gameTime+=200;updateShotList(bulletState.shots);
          };
          powers={immunity:gameTime+3000};shoot();assert(!over,'shield protects from fragments');
          powers={};shoot();assert(over,'unprotected fragment kills player');
        """)

    def test_pause_and_mobile_rotation_preserve_phase_and_reset_unsafe_shots(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.start_bullet()
        self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.wait_for_timeout(80)
        self.page.evaluate("""beginBulletPhase(11);placeFood();clearTimeout(timer);
          bulletState.progress=4;
          window.bulletPauseTime=gameTime;
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');
          boss.motion={from:{x:boss.x,y:boss.y},startedAt:performance.now()-20,duration:500};
          window.bossMotionStart=boss.motion.startedAt;
          togglePause();
        """)
        self.page.wait_for_timeout(50)
        self.assertEqual(self.page.evaluate('gameTime'),self.page.evaluate('window.bulletPauseTime'))
        self.check("""
          togglePause();clearTimeout(timer);
          assert(bulletState.enemies.find(e=>e.kind==='dutch').motion.startedAt>window.bossMotionStart+30,'enemy motion resumes without pause time');
          emitFourShots({x:5,y:5},'cannon');spawnCannonShadow();
        """)
        self.page.set_viewport_size({'width':844,'height':390})
        self.page.wait_for_timeout(80)
        self.check("""
          assert(bulletState.phase===11 && bulletState.progress===4,'phase progress preserved on rotation');
          assert(bulletState.shots.length===0 && bulletState.hazards.length===0,'offscreen threats cleared');
          assert(bulletState.enemies.every(e=>e.x>=0 && e.x<COLS && e.y>=0 && e.y<ROWS),'enemies remain inside resized map');
        """)

    def test_mobile_selection_double_tap_and_music_files(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate('goMenu()')
        self.page.locator('[data-mode=bullet]').click();self.page.locator('#startBtn').click()
        self.page.evaluate('clearTimeout(timer);stopMovementGuide();obstacles=[]')
        self.assertTrue(self.page.evaluate("gameMode==='bullet' && bulletState.phase===1"))
        for pointer in [61,62]:
            self.page.locator('#board').dispatch_event('pointerdown',{'pointerId':pointer,'pointerType':'touch','clientX':160,'clientY':260})
            self.page.locator('#board').dispatch_event('pointerup',{'pointerId':pointer,'pointerType':'touch','clientX':160,'clientY':260})
        self.assertTrue(self.page.evaluate('abilityReadyAt>gameTime && bulletState.bonusFoods.length===1'))
        self.page.evaluate("""async()=>{
          for(const key of ['bgm_bullet_mode','bgm_bullet_boss']){
            const track=musicTracks[key];
            if(track.readyState>=1 && track.duration>0)continue;
            await new Promise((resolve,reject)=>{track.addEventListener('loadedmetadata',resolve,{once:true});track.addEventListener('error',()=>reject(Error(key)),{once:true});track.load();});
            if(!(track.duration>0))throw Error('empty '+key);
          }
        }""")

    def test_bullet_breath_only_first_target_takes_damage(self):
        self.start_bullet()
        self.check("""
          snake=[{x:4,y:5},{x:3,y:5},{x:2,y:5}];previousSnake=snake.map(p=>({...p}));
          const enemies=[6,8,10].map(x=>({x,y:5,kind:'plankton',aggression:1,hits:0,maxHealth:5,nextMoveAt:Infinity}));
          bulletState.enemies=enemies;
          releaseFrostBreath();
          assert(enemies[0].hits===2 && enemies[1].hits===0 && enemies[2].hits===0,'only nearest enemy receives breath damage');
          assert(enemies.every(e=>e.frozenUntil===gameTime+3000),'all targets frozen');
        """)

    def test_boss_ten_hp_slow_pacing_and_once_only_telegraphed_barrage(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);placeFood();
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');
          assert(boss.maxHealth===10,'boss has 10 hp');
          const redInterval=enemyInterval({aggression:3});
          assert(enemyInterval(boss)>=199 && enemyInterval(boss)>=redInterval*.94 && enemyInterval(boss)<redInterval,'slower boss, only slightly faster than red');
          boss.nextMoveAt=Infinity;boss.shootAt=Infinity;bulletState.enemies=[boss];
          bulletState.nextCannon=Infinity;bulletState.nextRespawn=Infinity;
          const events=[],original=playEffect;playEffect=k=>events.push(k);
          try{
            damageBulletEnemy(boss,6,0);assert(!boss.barrage,'no premature special');
            damageBulletEnemy(boss,1,0);
            assert(events.includes('barrageWarning') && !bulletState.hazards.length,'distinct warning before shadows');
            const deployAt=boss.barrage.deployAt;
            gameTime=deployAt-1;updateBulletMode();assert(!bulletState.hazards.length,'warning has reaction time');
            gameTime=deployAt;updateBulletMode();
            const hazards=bulletState.hazards;
            assert(hazards.length===COLS && new Set(hazards.map(h=>h.x)).size===COLS && new Set(hazards.map(h=>h.y)).size===1,'entire bomb row');
            assert(hazards.every(h=>h.impactAt-h.startedAt>=2000 && h.fireAt-h.startedAt>=2700),'slow impacts');
            assert(events.includes('cannonFall'),'fall sound');
            damageBulletEnemy(boss,1,0);assert(events.filter(e=>e==='barrageWarning').length===1,'only once');
            gameTime=hazards[0].fireAt;updateBulletMode();
            assert(events.includes('cannonBurst') && bulletState.shots.length===4,'impact sound and fragments');
            assert(bulletState.shots.every(s=>s.speed<bulletState.profile.shotSpeed),'barrage fragments slower');
            draw();
          }finally{playEffect=original;}
        """)

    def test_progress_and_shield_bars_match_hud_and_sfx_are_distinct(self):
        self.start_bullet()
        self.check("""
          bulletState.progress=2;bulletState.immunityCount=2;updateBulletHud();
          assert(bossStatus.textContent==='2/5 - escudo 2/3','integrated readable counters');
          const phase=document.getElementById('bulletPhaseProgress'),shield=document.getElementById('bulletShieldProgress');
          assert(phase.max===5 && phase.value===2 && shield.max===3 && shield.value===2,'charging bars reflect counters');
          beginBulletPhase(11);updateBulletHud();
          assert(bossStatus.textContent==='Chefe 10/10 - escudo 0/3','boss victory stays based on hp');
          for(const key of ['cannonFall','cannonBurst','dutchShot','barrageWarning'])assert(effectNotes[key]?.length>0,'new synthesized '+key);
          gameMode='classic';updateStatus();
          assert(getComputedStyle(document.getElementById('bulletProgressHud')).display==='none','no Bullet bars in other modes');
        """)

    def test_only_green_advances_every_phase_and_stays_exclusive_to_bullet(self):
        self.start_bullet()
        self.check("""
          for(const phase of [1,4,5,7,8,10,11,12]){
            beginBulletPhase(phase);placeFood();
            assert(food.type===chooseFoodType() && (phase<=11?food.type==='green':['green','red'].includes(food.type)),'main food follows phase rules '+phase);
            for(const type of ['normal','red','super']){
              food={...snake[0],type,id:++foodSerial};bulletState.mainFood=food;collectFood();
              assert(bulletState.progress===0,'non-green never progresses phase '+phase);
            }
            food={...snake[0],type:'green',id:++foodSerial};bulletState.mainFood=food;collectFood();
            assert(bulletState.progress===1 && food.type===(phase>=11?'red':'green'),'only green progresses and next main color follows phase rules');
          }
          for(const mode of ['classic','battle']){
            gameMode=mode;plankton=null;battleEnemies=[];powers={};battleRewards=0;
            for(let i=0;i<20;i++)assert(chooseFoodType(i/20,i/20)!=='green','green exclusive to Bullet Hell');
          }
        """)

    def test_green_projectiles_pierce_multiple_enemies_once_and_stop_at_boss(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);obstacles=[];
          snake=[{x:1,y:1}];previousSnake=snake.map(p=>({...p}));
          const make=(x,kind='plankton')=>({x,y:5,kind,aggression:1,hits:0,maxHealth:10,stunnedUntil:0,nextMoveAt:Infinity});
          const first=make(4),second=make(6),boss=make(9,'dutch'),behind=make(11);first.maxHealth=2;
          bulletState.enemies=[first,second,boss,behind];bulletState.shots=[];
          emitFourShots({x:2,y:5},'green');
          const shot=bulletState.shots.find(s=>s.dx===1);
          shot.speed=10;
          gameTime+=410;updateShotList([shot]);
          assert(first.hits===2 && second.hits===2 && !shot.dead,'one shot pierces two Planktons in one step');
          assert(!bulletState.enemies.includes(first),'killing first enemy does not consume shot');
          updateShotList([shot]);
          assert(first.hits===2 && second.hits===2,'same-frame overlap cannot hit twice');
          gameTime+=20;updateShotList([shot]);
          assert(second.hits===2 && !shot.dead,'next frame cannot hit same enemy twice');
          gameTime+=500;updateShotList([shot]);
          assert(boss.hits===1 && shot.dead && behind.hits===0,'boss takes exactly 1 hp and blocks further travel');
        """)

    def test_green_collection_uses_distinct_ghostly_sound_and_obeys_mute(self):
        self.start_bullet()
        self.check("""
          const events=[],original=playEffect;playEffect=k=>events.push(k);
          try{
            food={...snake[0],type:'green',id:++foodSerial};bulletState.mainFood=food;
            collectFood();
            assert(events.includes('green') && !events.includes('collect'),'green has its own ghostly cue');
            assert(effectNotes.green.length>=2 && effectNotes.green!==effectNotes.ghost,'layered original collection sound');
          }finally{playEffect=original;}
          stopEffects();effectsMuted=true;playEffect('green');
          assert(activeEffects.size===0,'effects mute silences green cue');
          effectsMuted=false;allMuted=true;playEffect('green');
          assert(activeEffects.size===0,'master mute silences green cue');
        """)

    def test_boss_defeat_preserves_pending_red_spawn(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);placeFood();
          food={...snake[0],type:'green',id:++foodSerial};bulletState.mainFood=food;collectFood();
          assert(food.type==='red','green is followed by red');
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');
          damageBulletEnemy(boss,DUTCH_BOSS_HEALTH,0);updateBulletMode();
          assert(bulletState.phase===12 && food.type==='red','boss victory cannot reset pending color to green');
        """)
