"""Stacked draft pool, mythic probability and new combat upgrades."""
import unittest
from tests import test_game, test_bullet_hell


class BulletUpgradePoolTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check
    start_bullet=test_bullet_hell.BulletHellTests.start_bullet

    def test_three_milestones_offer_refused_and_unused_cards_and_stack_choices(self):
        self.start_bullet()
        self.check("""
          const original=Math.random;Math.random=()=>.5;
          try{
            beginBulletPhase(3);
            assert(paused && bulletState.offeredUpgrades.join(',')==='frost,homing,revive','phase 3 base cards');
            assert(!chooseBulletUpgrade('laser'),'cannot choose unoffered card');
            chooseBulletUpgrade('revive');clearTimeout(timer);bulletState.reviveCharges=0;
            beginBulletPhase(5);assert(!paused,'phase 5 no longer interrupts');
            beginBulletPhase(6);
            const second=[...bulletState.offeredUpgrades];
            assert(paused && second.length===3 && second.includes('frost') && second.includes('homing'),'two refused base cards return');
            assert(second.some(id=>['laser','luck'].includes(id)) && !second.includes('revive'),'one fresh card and no consumed revive repeat');
            chooseBulletUpgrade('frost');clearTimeout(timer);
            beginBulletPhase(9);
            assert(paused && bulletState.offeredUpgrades.length===3 && new Set(bulletState.offeredUpgrades).size===3,'third selection contains three unique cards');
            assert(bulletState.offeredUpgrades.includes('homing') && bulletState.offeredUpgrades.includes('laser') && bulletState.offeredUpgrades.includes('luck'),'refused and unused normal pool');
            chooseBulletUpgrade('homing');clearTimeout(timer);
            assert(['revive','frost','homing'].every(hasBulletUpgrade),'all choices stack');
            beginBulletPhase(10);beginBulletPhase(11);
            assert(!paused && bulletState.upgradePhases.join(',')==='3,6,9','no additional drafts after phase 9');
          }finally{Math.random=original;}
        """)

    def test_mythic_has_exact_ten_percent_gate_at_each_later_draft(self):
        self.start_bullet()
        self.check("""
          bulletState.upgrades=['frost'];
          for(const phase of [6,9]){
            let mythical=0;
            for(let n=0;n<1000;n++){
              let calls=0;const rng=()=>calls++===0?n/1000:.4;
              const offers=rollBulletUpgradeOffers(phase,rng);
              assert(offers.length===3 && new Set(offers).size===3 && !offers.includes('frost'),'three distinct unowned cards');
              if(offers.includes('mythic'))mythical++;
            }
            assert(mythical===100,'mythic offered in precisely ten percent of gate samples');
          }
          bulletState.upgrades=['frost','mythic'];
          assert(!rollBulletUpgradeOffers(9,()=>0).includes('mythic'),'chosen mythic never offered again');
        """)

    def test_mythic_refused_in_phase_six_can_return_in_phase_nine(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('frost');clearTimeout(timer);
          const original=Math.random;Math.random=()=>0;
          try{
            beginBulletPhase(6);assert(bulletState.offeredUpgrades.includes('mythic'),'mythic offered on ten percent roll');
            chooseBulletUpgrade('homing');clearTimeout(timer);
            beginBulletPhase(9);assert(bulletState.offeredUpgrades.includes('mythic'),'refused mythic remains eligible at next ten percent roll');
            chooseBulletUpgrade('mythic');clearTimeout(timer);
            assert(hasBulletUpgrade('frost') && hasBulletUpgrade('homing') && bulletState.mythicCharges===1,'third choice adds charge without replacing previous upgrades');
          }finally{Math.random=original;}
        """)

    def test_red_burger_piercing_laser_hits_all_on_forward_ray_once(self):
        self.start_bullet()
        self.check("""
          bulletState.upgrades=['laser'];snake=[{x:5,y:5}];previousSnake=snake.map(p=>({...p}));
          const make=(x,y,kind='plankton')=>({x,y,kind,aggression:1,hits:0,maxHealth:10,nextMoveAt:Infinity});
          const first=make(7,5),second=make(10,5),boss=make(12,5,'dutch'),off=make(7,7),behind=make(2,5);
          bulletState.enemies=[first,second,boss,off,behind];
          food={x:5,y:5,type:'red',id:++foodSerial};bulletState.mainFood=food;collectFood();
          assert(first.hits===1 && second.hits===1 && boss.hits===1,'laser pierces every enemy in line');
          assert(off.hits===0 && behind.hits===0,'off-axis and backward enemies excluded');
          assert(beam.piercing && beam.to.x>boss.x && beam.to.y===5,'straight beam extends to board edge');
          assert(bulletState.progress===0 && food.type==='green','red retains food progression rules');
        """)

    def test_luck_proc_negates_real_damage_and_grants_four_seconds(self):
        self.start_bullet()
        self.check("""
          bulletState.upgrades=['luck'];powers={};snake=[{x:5,y:5},{x:4,y:5}];previousSnake=snake.map(p=>({...p}));
          direction=nextDirection={x:1,y:0};directionQueue=[];obstacles=[{x:6,y:5}];food={x:20,y:15,type:'green'};
          bulletState.enemies=[];bulletState.nextCannon=Infinity;bulletState.nextRespawn=Infinity;
          const original=Math.random;Math.random=()=>.199;
          try{
            tick();clearTimeout(timer);
            assert(!over && powers.luck===gameTime+4000 && isInvulnerable(),'roll below 20 percent negates collision');
            const until=powers.luck;
            tick();clearTimeout(timer);assert(!over && snake[0].x===6,'intangible player moves through obstacle');
            draw();assert(powerStatus.querySelector('[data-power=luck]'),'intangibility visible in power HUD');
            gameTime=until;assert(!isInvulnerable(),'four seconds exactly');
            Math.random=()=>.2;endGame();assert(over,'roll at 20 percent boundary fails');
          }finally{Math.random=original;}
        """)

    def test_luck_checks_before_consuming_revive(self):
        self.start_bullet()
        self.check("""
          bulletState.upgrades=['luck','revive'];bulletState.reviveCharges=1;powers={};
          const original=Math.random;Math.random=()=>.1;
          try{
            endGame();assert(!over && bulletState.reviveCharges===1,'successful amulet preserves revive charge');
            gameTime=powers.luck+1;Math.random=()=>.2;endGame();
            assert(!over && bulletState.reviveCharges===0 && powers.immunity===gameTime+5000,'failed luck falls back to revive');
          }finally{Math.random=original;}
        """)

    def test_mythic_key_activation_one_charge_friendly_projectiles_and_damage(self):
        self.start_bullet()
        self.page.evaluate("bulletState.upgrades=['mythic'];bulletState.mythicCharges=1;updateStatus();clearTimeout(timer)")
        self.assertTrue(self.page.locator('#mythicAbilityBtn').is_visible())
        self.page.keyboard.press('v')
        self.check("""
          assert(bulletState.mythicCharges===0 && bulletState.shots.length===56,'one charge creates screen-wide storm');
          assert(!useBulletMythic() && mythicAbilityButton.hidden,'cannot activate twice');
          assert(bulletState.shots.every(s=>s.owner==='mythic'),'storm belongs to player');
          updateShotList(bulletState.shots);assert(!over,'own bullets harmless even at spawn');
          const makeShot=(x,y)=>({x,y,px:x,py:y,dx:1,dy:0,owner:'mythic',speed:10,lastAt:gameTime,until:gameTime+5000});
          obstacles=[{x:6,y:5}];bulletState.enemies=[];const rockShot=makeShot(5,5);
          gameTime+=100;updateShotList([rockShot]);assert(!obstacles.length && rockShot.dead,'purple shot destroys obstacle on impact');
          const enemy={x:8,y:5,kind:'plankton',aggression:1,hits:0,maxHealth:8};bulletState.enemies=[enemy];
          const shot=makeShot(7,5);gameTime+=100;updateShotList([shot]);
          assert(enemy.hits===2 && shot.dead,'purple shot deals two damage');draw();
          startGame({skipTutorial:true});clearTimeout(timer);stopMovementGuide();
          assert(!bulletState.upgrades.length && !bulletState.mythicCharges && mythicAbilityButton.hidden,'restart clears all upgrades and charge');
        """)

    def test_mythic_card_tag_animation_and_mobile_button_activation(self):
        self.start_bullet()
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("""game.classList.add('fallback-fullscreen');resizeBoardForViewport();
          beginBulletPhase(3);chooseBulletUpgrade('frost');clearTimeout(timer);
          const original=Math.random;Math.random=()=>0;try{beginBulletPhase(6);placeFood();}finally{Math.random=original;}
        """)
        card=self.page.locator('[data-upgrade=mythic]')
        self.assertEqual(card.locator('.mythic-tag').inner_text(),'MÍTICO')
        self.assertTrue(card.locator('img').evaluate('(i)=>i.complete && i.naturalWidth>0'))
        self.assertIn('mythic-glow',card.evaluate('(b)=>getComputedStyle(b).animationName'))
        card.click()
        self.page.evaluate('clearTimeout(timer)')
        self.assertTrue(self.page.locator('#mythicAbilityBtn').is_visible())
        self.page.locator('#mythicAbilityBtn').click()
        self.assertTrue(self.page.evaluate("bulletState.mythicCharges===0 && bulletState.shots.some(s=>s.owner==='mythic')"))
        self.page.evaluate('clearTimeout(timer)')

    def test_later_choices_preserve_charges_and_revive_keeps_friendly_storm(self):
        self.start_bullet()
        self.check("""
          beginBulletPhase(3);chooseBulletUpgrade('revive');clearTimeout(timer);
          const original=Math.random;Math.random=()=>0;
          try{beginBulletPhase(6);}finally{Math.random=original;}
          chooseBulletUpgrade('mythic');clearTimeout(timer);
          assert(bulletState.reviveCharges===1 && bulletState.mythicCharges===1,'second choice preserves first charge');
          Math.random=()=>0;try{beginBulletPhase(9);}finally{Math.random=original;}
          chooseBulletUpgrade('laser');clearTimeout(timer);
          assert(bulletState.reviveCharges===1 && bulletState.mythicCharges===1,'third choice preserves both unused charges');
          assert(useBulletMythic(),'storm available after third choice');
          endGame();
          assert(!over && bulletState.reviveCharges===0 && bulletState.shots.filter(s=>s.owner==='mythic').length===56,'revive removes hazards but preserves own storm');
        """)
