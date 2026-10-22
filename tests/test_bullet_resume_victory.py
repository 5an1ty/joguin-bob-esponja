"""Whole-world resume clock, fixed quotas and explicit post-boss outcomes."""
import unittest
from tests import test_game, test_bullet_hell


class BulletResumeVictoryTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check
    start_bullet=test_bullet_hell.BulletHellTests.start_bullet

    def test_ramp_clock_and_inverse_delays_cover_exactly_four_seconds(self):
        self.start_bullet()
        self.check("""
          const start=performance.now();startBulletResumeRamp(start);clearTimeout(timer);
          const origin=getBulletClock(start);
          for(const elapsed of [0,1000,2000,3000,4000]){
            assert(Math.abs(bulletResumeScale(start+elapsed)-elapsed/4000)<.00001,'linear speed percentage');
            assert(Math.abs(getBulletClock(start+elapsed)-origin-elapsed*elapsed/8000)<.00001,'integrated world time');
          }
          assert(getBulletClock(start+5000)-origin===3000 && bulletResumeScale(start+5000)===1,'full speed after four seconds');
          for(const elapsed of [0,1000,3000,4500]){
            const real=start+elapsed,wait=bulletRealDelay(300,real);
            assert(Math.abs(getBulletClock(real+wait)-getBulletClock(real)-300)<.001,'timer inverse matches virtual time');
          }
        """)

    def prepare_live_ramp(self):
        self.page.clock.install()
        self.start_bullet()
        self.page.evaluate("""
          beginBulletPhase(3);chooseBulletUpgrade('frost');clearTimeout(timer);stopMovementGuide();
          snake=[{x:5,y:10},{x:4,y:10},{x:3,y:10},{x:2,y:10}];previousSnake=snake.map(p=>({...p}));lastVisualPositions=[];
          direction=nextDirection={x:1,y:0};directionQueue=[];obstacles=[];powers={};food={x:25,y:19,type:'green'};
          bulletState.profile.snakeSpeed=200;bulletState.profile.enemyInterval=2000;currentSpeed=motionDuration=200;
          gameTime=0;lastMoveAt=gameplayNow();
          bulletState.enemies=[{x:15,y:5,id:900,kind:'plankton',aggression:1,hits:0,maxHealth:8,nextMoveAt:1000,stunnedUntil:0}];
          bulletState.shots=[{x:0,y:0,px:0,py:0,dx:1,dy:0,owner:'cannon',speed:2,lastAt:0,until:10000}];
          bulletState.nextCannon=Infinity;bulletState.nextRespawn=Infinity;
          startBulletResumeRamp();
        """)

    def test_real_scheduler_scales_player_enemies_and_projectiles_together(self):
        self.prepare_live_ramp()
        self.page.clock.run_for(1000)
        self.check("""
          assert(gameTime<200 && snake[0].x===5,'player starts at zero speed');
          assert(bulletState.enemies[0].x===15 && bulletState.enemies[0].y===5 && bulletState.shots[0].x===0,'enemies and shots share slow start');
          assert(bulletResumeScale()>.24 && bulletResumeScale()<.26,'one second is quarter speed');
        """)
        # check() clears the timer, so explicitly resume the scheduler between probes.
        self.page.evaluate('scheduleTick()')
        self.page.clock.run_for(3000)
        self.check("""
          assert(gameTime>=1800 && gameTime<=2000,'four wall seconds integrate two simulation seconds');
          assert(snake[0].x>=14 && snake[0].x<=15,'player follows same scaled clock');
          assert(torusDistance(bulletState.enemies[0],{x:15,y:5})===1 && bulletState.enemies[0].nextMoveAt===3000,'enemy has made only its scheduled move');
          assert(Math.abs(bulletState.shots[0].x-gameTime/1000*2)<.001,'projectile speed scales with the same clock');
          assert(bulletResumeScale()===1,'normal speed restored');
        """)

    def test_pause_suspends_ramp_progress_and_restart_clears_it(self):
        self.prepare_live_ramp();self.page.clock.run_for(1000)
        self.page.evaluate('window.savedScale=bulletResumeScale();window.savedTime=gameTime;togglePause()')
        self.page.clock.run_for(3000)
        self.assertEqual(self.page.evaluate('gameTime'),self.page.evaluate('window.savedTime'))
        self.page.evaluate('togglePause()')
        self.assertAlmostEqual(self.page.evaluate('bulletResumeScale()'),self.page.evaluate('window.savedScale'),delta=.01)
        self.page.clock.run_for(3000)
        self.check("""
          assert(bulletResumeScale()===1,'remaining three seconds complete ramp');
          startGame({skipTutorial:true});clearTimeout(timer);stopMovementGuide();
          assert(!bulletState.resumeRamp && bulletResumeScale()===1 && !bulletState.infinite,'new game clears transition and endless state');
        """)

    def test_every_card_choice_begins_a_new_zero_speed_ramp(self):
        self.start_bullet()
        self.check("""
          for(const phase of [3,6,9]){
            beginBulletPhase(phase);placeFood();
            assert(paused && bulletState.upgradePending,'draft pauses first');
            chooseBulletUpgrade(bulletState.offeredUpgrades[0]);clearTimeout(timer);
            const ramp=bulletState.resumeRamp;
            assert(!paused && ramp && bulletResumeScale(ramp.startedAt)===0,'every card starts from zero');
            assert(bulletResumeScale(ramp.startedAt+4000)===1,'each ramp lasts four seconds');
          }
        """)

    def test_boss_death_waits_for_continue_then_infinite_scales_without_food(self):
        self.start_bullet()
        self.check("""
          for(let phase=1;phase<=10;phase++)assert(bulletGoal(phase)===5,'five greens every fixed phase');
          beginBulletPhase(11);placeFood();
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');damageBulletEnemy(boss,10,0);
          assert(paused && bulletState.bossDecisionPending && !bulletBossDecision.hidden && bulletState.phase===11,'boss death requires an outcome');
          togglePause();assert(paused,'pause shortcut cannot bypass outcome');
          assert(!advanceBulletIfReady() && dutchUnlocked,'reward unlocks but next phase waits');
          assert(chooseBulletBossOutcome('continue') && !paused && bulletState.phase===12 && bulletState.infinite,'continue starts endless');
          assert(!chooseBulletBossOutcome('finish'),'only one outcome accepted');
          const base={...bulletState.profile};gameTime+=60000;updateBulletInfinitePressure();refreshSpeed();
          assert(bulletState.phase===12 && bulletState.progress===0,'no food needed for continuous pressure');
          assert(bulletState.profile.snakeSpeed<base.snakeSpeed && bulletState.profile.enemyInterval<base.enemyInterval && bulletState.profile.shotSpeed>base.shotSpeed,'continuous speed scaling');
          assert(bulletState.profile.cannonDelay<base.cannonDelay && bulletState.profile.maxCannons>base.maxCannons,'continuous hazard scaling');
        """)

    def test_finish_shows_victory_rewards_without_using_defensive_upgrades(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(11);placeFood();bulletState.upgrades=['luck','revive'];bulletState.reviveCharges=1;
          const boss=bulletState.enemies.find(e=>e.kind==='dutch');damageBulletEnemy(boss,10,0);
          chooseBulletBossOutcome('finish');
          assert(over && bulletState.victoryComplete && !bulletState.infinite && bulletState.phase===11,'finish ends run');
          assert(bulletState.reviveCharges===1,'voluntary victory does not consume revive');
          assert(document.getElementById('overlayTitle').textContent.includes('Vitória') && document.getElementById('overlayText').textContent.includes('desbloqueado'),'victory and reward shown');
          assert(overlay.classList.contains('hidden')===false && document.getElementById('resumeBtn').classList.contains('hidden'),'victory cannot resume');
          assert(currentMusicKey==='bgm_menu_mode' && dutchUnlocked,'victory music and persistent unlock');
        """)
        self.page.locator('#menuBtn').click()
        self.assertFalse(self.page.locator('[data-character=dutch]').is_disabled())

    def test_boss_decision_fits_mobile_and_stops_remaining_damage(self):
        self.page.set_viewport_size({'width':390,'height':844});self.start_bullet()
        self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport();beginBulletPhase(11);placeFood();damageBulletEnemy(bulletState.enemies.find(e=>e.kind==='dutch'),10,0);clearTimeout(timer)")
        self.check("""
          const panel=bulletBossDecision.querySelector('section').getBoundingClientRect();
          assert(panel.left>=0 && panel.right<=innerWidth && panel.top>=0 && panel.bottom<=innerHeight,'mobile decision fits');
          bulletState.shots=[{...snake[0],px:snake[0].x,py:snake[0].y,dx:1,dy:0,owner:'cannon',speed:5,lastAt:gameTime,until:gameTime+6000}];
          updateShotList(bulletState.shots);assert(!over && paused,'remaining hostile shots cannot kill behind decision');
        """)
        self.page.locator('#bulletFinishBtn').focus();self.page.keyboard.press('Tab')
        self.assertTrue(self.page.locator('#bulletInfiniteBtn').evaluate('(b)=>b===document.activeElement'))
        self.page.locator('#bulletInfiniteBtn').click();self.page.evaluate('clearTimeout(timer)')
        self.assertTrue(self.page.evaluate('bulletState.infinite && !paused'))
