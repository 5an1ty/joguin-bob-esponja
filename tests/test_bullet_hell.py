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
            if(phase<3)assert(obstacles.length===0,'no early rocks');
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
          const speed=currentSpeed,main=food,next=bulletState.nextFood;
          abilityReadyAt=0;assert(useAbility(),'Bob works');
          assert(food===main && bulletState.nextFood===next && mapFoods().length===2,'bonus does not replace primary');
          food=bulletState.bonusFoods[0];collectFood();refreshSpeed();
          assert(food===main && bulletState.nextFood===next && currentSpeed===speed,'yellow power does not accelerate Bullet Hell or disturb sequence');
        """)

    def test_green_red_alternation_and_only_green_progresses_boss_and_infinite(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);placeFood();
          for(let i=0;i<8;i++){
            const type=i%2===0?'green':'red';assert(food.type===type,'strict alternating type '+i);
            food={...snake[0],type,id:++foodSerial};bulletState.mainFood=food;
            collectFood();clearTimeout(timer);
            assert(bulletState.progress===Math.floor(i/2)+1,'only green counts');
            assert(bulletState.phase===11,'food alone does not win boss phase');
          }
          assert(bulletState.shots.filter(s=>s.owner==='green').length===16,'four shots for each green collection');
          beginBulletPhase(12);placeFood();const speed=currentSpeed;
          food={...snake[0],type:'red',id:++foodSerial};bulletState.mainFood=food;collectFood();
          assert(bulletState.progress===0 && currentSpeed===speed,'red not progress in infinite');
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
          const boss={x:5,y:3,kind:'dutch',aggression:4,hits:0,maxHealth:16,stunnedUntil:0,nextMoveAt:Infinity,shootAt:Infinity,windup:null};
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
