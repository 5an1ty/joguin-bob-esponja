"""Three-stage choice, upgrade effects and progressive cannon density in Chromium."""
import unittest
from tests import test_game
from tests import test_bullet_hell


class BulletUpgradeTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check
    start_bullet=test_bullet_hell.BulletHellTests.start_bullet

    def test_phase_three_choice_freezes_game_and_requires_exactly_one_selection(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(2);bulletState.progress=4;
          food={...wrap({x:snake[0].x+direction.x,y:snake[0].y+direction.y}),type:'green',id:++foodSerial};bulletState.mainFood=food;
          tick();
          assert(bulletState.phase===3 && paused && bulletState.upgradePending,'phase 3 pauses for choice');
          assert(food.type==='red' && bulletState.progress===0,'food alternation survives choice');
          assert(!bulletUpgradeDialog.hidden && overlay.classList.contains('hidden'),'upgrade is the active dialog');
          togglePause();assert(paused,'pause shortcut cannot bypass choice');
          window.upgradeClock=gameTime;
        """)
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('gameTime'),self.page.evaluate('window.upgradeClock'))
        self.assertEqual(self.page.locator('#bulletUpgradeDialog button').count(),3)
        self.assertTrue(self.page.locator('#bulletUpgradeDialog img').evaluate_all('(imgs)=>imgs.every(i=>i.complete && i.naturalWidth>0)'))
        self.page.locator('[data-upgrade=homing]').click()
        self.check("""
          assert(!paused && bulletUpgradeDialog.hidden && hasBulletUpgrade('homing'),'choice resumes same phase');
          assert(!chooseBulletUpgrade('revive') && bulletState.reviveCharges===0,'second selection rejected');
          beginBulletPhase(4);assert(!paused && hasBulletUpgrade('homing'),'upgrade persists between milestones');
        """)

    def test_frost_upgrade_damages_first_and_later_targets(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('frost');clearTimeout(timer);
          snake=[{x:4,y:5},{x:3,y:5},{x:2,y:5}];previousSnake=snake.map(p=>({...p}));
          const enemies=[6,8,10].map(x=>({x,y:5,kind:'plankton',aggression:1,hits:0,maxHealth:8,nextMoveAt:Infinity}));
          bulletState.enemies=enemies;releaseFrostBreath();
          assert(enemies[0].hits===3 && enemies[1].hits===2 && enemies[2].hits===2,'upgraded cone is 3/2/2');
          assert(enemies.every(e=>e.frozenUntil===gameTime+3000),'all targets still freeze');
        """)

    def test_homing_seeks_nearby_plankton_without_changing_speed_or_hitting_twice(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('homing');clearTimeout(timer);
          const enemy={x:7,y:7,kind:'plankton',aggression:1,hits:0,maxHealth:8};
          bulletState.enemies=[enemy];bulletState.shots=[];emitFourShots({x:5,y:5},'green');
          const shot=bulletState.shots.find(s=>s.dx===1),speed=shot.speed;
          gameTime+=100;updateShotList([shot]);
          assert(shot.dy>0 && shot.dx>0 && shot.speed===speed && Math.abs(Math.hypot(shot.dx,shot.dy)-1)<.0001,'shot bends toward target at constant speed');
          const direction={x:shot.dx,y:shot.dy};enemy.x=COLS-1;enemy.y=ROWS-1;
          steerBulletHoming(shot,.2);assert(shot.dx===direction.x && shot.dy===direction.y,'targets beyond six cells ignored');
          enemy.x=shot.x;enemy.y=shot.y+1;enemy.kind='dutch';
          steerBulletHoming(shot,.2);assert(shot.dx===direction.x && shot.dy===direction.y,'only Planktons are homing targets');
          enemy.kind='plankton';shot.hitEnemies=new Set([enemy]);steerBulletHoming(shot,.2);
          assert(shot.dx===direction.x && shot.dy===direction.y,'previously pierced target ignored');
        """)

    def test_revive_handles_real_fatal_collision_once_and_grants_five_seconds(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('revive');clearTimeout(timer);
          snake=[{x:5,y:5},{x:4,y:5},{x:3,y:5},{x:2,y:5}];previousSnake=snake.map(p=>({...p}));
          direction=nextDirection={x:1,y:0};directionQueue=[];powers={};
          bulletState.enemies=[];bulletState.progress=2;score=123;
          obstacles=[{x:6,y:5}];food={x:20,y:15,type:'green',id:++foodSerial};bulletState.mainFood=food;
          tick();clearTimeout(timer);
          assert(!over && bulletState.reviveCharges===0 && powers.immunity===gameTime+5000,'fatal obstacle consumes one revive');
          assert(isInvulnerable() && bulletState.progress===2 && score===123 && bulletState.phase===3,'same run preserved with immunity');
          assert(overlay.classList.contains('hidden'),'revive does not show game-over dialog');
          const until=bulletState.reviveUntil;
          for(let i=0;i<3;i++){food={...snake[0],type:'green',id:++foodSerial};bulletState.mainFood=food;collectFood();}
          assert(powers.immunity===until,'food shield cannot shorten revival protection');
          gameTime=until-1;assert(isInvulnerable(),'protected for full five seconds');endGame();assert(!over,'same incident cannot kill again');
          gameTime=until;assert(!isInvulnerable(),'protection expires');endGame();assert(over,'next death is final');
        """)

    def test_restart_resets_upgrade_and_return_to_menu_closes_choice(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('revive');clearTimeout(timer);
          beginBulletPhase(4);assert(bulletState.reviveCharges===1,'unused charge persists');
          startGame({skipTutorial:true});clearTimeout(timer);stopMovementGuide();
          assert(bulletState.upgrades.length===0 && bulletState.reviveCharges===0 && !paused,'new run resets choice');
          beginBulletPhase(3);assert(bulletState.upgradePending,'new run gets new choice');
          goMenu();assert(bulletUpgradeDialog.hidden && !bulletState.upgradePending,'menu clears modal');
        """)

    def test_more_bombs_per_phase_and_batch_limit(self):
        self.start_bullet()
        self.check("""
          let lastDelay=Infinity,lastCap=0;
          for(let phase=1;phase<=10;phase++){
            const p=bulletProfile(phase);
            assert(p.cannonDelay<lastDelay && p.maxCannons>lastCap,'higher bomb density per phase');
            lastDelay=p.cannonDelay;lastCap=p.maxCannons;
          }
          beginBulletPhase(8);bulletState.enemies=[];bulletState.nextRespawn=Infinity;bulletState.nextCannon=gameTime;
          updateBulletMode();
          assert(bulletState.hazards.length===bulletState.profile.cannonBatch && bulletState.hazards.length>=3,'several shadows spawn per wave');
          assert(new Set(bulletState.hazards.map(h=>h.x+','+h.y)).size===bulletState.hazards.length,'bomb positions unique');
          bulletState.profile.maxCannons=bulletState.hazards.length+1;bulletState.nextCannon=gameTime;
          updateBulletMode();assert(bulletState.hazards.length===bulletState.profile.maxCannons,'wave respects simultaneous cap');
          assert(bulletProfile(11).maxCannons<bulletProfile(10).maxCannons && bulletProfile(11).cannonBatch<bulletProfile(10).cannonBatch,'boss retains reduced cannon pressure');
        """)

    def test_mobile_choice_cards_fit_and_keyboard_focus_stays_in_dialog(self):
        self.start_bullet()
        for width,height in [(390,844),(844,390),(320,568)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport();bulletState.upgrades=[];bulletState.upgradePhases=[];beginBulletPhase(3);placeFood();clearTimeout(timer)")
            self.check("""
              const panel=bulletUpgradeDialog.querySelector('.upgrade-panel').getBoundingClientRect();
              assert(panel.left>=0 && panel.right<=innerWidth && panel.top>=0 && panel.bottom<=innerHeight,'panel fits screen');
              assert([...bulletUpgradeDialog.querySelectorAll('button')].every(b=>b.getBoundingClientRect().width>80),'three usable choice targets');
            """)
            self.page.locator('[data-upgrade=revive]').focus();self.page.keyboard.press('Tab')
            self.assertTrue(self.page.locator('[data-upgrade=frost]').evaluate('(b)=>b===document.activeElement'))
            self.page.locator('[data-upgrade=frost]').click()
            self.page.evaluate('clearTimeout(timer)')
