"""Regressões no Chromium: python3 -m unittest discover -s tests -v.
Requer Playwright Python e Chromium (CHROMIUM_PATH opcional).
"""
import functools
import http.server
import os
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class GameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1] / 'megabrain'
        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.page = self.browser.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/', wait_until='domcontentloaded')
        self.page.locator('#startBtn').click()
        self.page.evaluate('clearInterval(timer); obstacles=[]; food={x:20,y:15,type:"normal"}')

    def tearDown(self):
        self.page.close()
        self.assertEqual(self.errors, [])

    def check(self, body):
        self.page.evaluate('''() => {
          const assert = (ok, message) => { if (!ok) throw Error(message); };
          try {''' + body + '''} finally { clearInterval(timer); }
        }''')

    def test_wrap_in_all_four_directions(self):
        self.check('''
          for (const [head,dir,expected] of [
            [{x:29,y:10},{x:1,y:0},{x:0,y:10}],
            [{x:0,y:10},{x:-1,y:0},{x:29,y:10}],
            [{x:10,y:0},{x:0,y:-1},{x:10,y:20}],
            [{x:10,y:20},{x:0,y:1},{x:10,y:0}]
          ]) {
            snake=[head]; direction=dir; nextDirection=dir; tick();
            assert(!over && same(snake[0],expected),'portal');
          }
        ''')

    def test_powers_protect_only_their_own_collisions(self):
        self.check('''
          const reset = () => {
            startGame();clearInterval(timer);obstacles=[];
            food={x:20,y:15,type:'normal'};
          };
          for(const power of ['ghost','super']) {
            reset(); powers[power]=10000;
            snake=[{x:8,y:10},{x:8,y:11},{x:9,y:11},{x:9,y:10},{x:10,y:10}];
            tick();assert(!over,'body power '+power);
          }
          for(const power of ['drill','super']) {
            reset();powers[power]=10000;obstacles=[{x:9,y:10}];
            tick();assert(!over,'obstacle power '+power);
          }
          reset();powers.ghost=10000;obstacles=[{x:9,y:10}];
          tick();assert(over,'ghost must not cross obstacles');
          reset();obstacles=[{x:9,y:10}];tick();assert(over,'normal collision');
          reset();powers.drill=1;obstacles=[{x:9,y:10}];tick();
          assert(over,'expired drill');
        ''')

    def test_all_food_powers_and_pause_timers(self):
        self.check('''
          for(const type of ['ghost','drill','magnet','super']) {
            powers={};
            food={...snake[0],type};collectFood();clearInterval(timer);
            assert(hasPower(type),'collect '+type);
          }
          assert(currentSpeed < settings.easy.speed,'super speed');
          const now=gameTime, enemy={x:15,y:15,hits:0,stunnedUntil:0};
          plankton=enemy;paused=true;tick();
          assert(gameTime===now && same(plankton,enemy),'pause freezes game');
          paused=false;gameTime=11000;refreshSpeed();
          assert(!hasPower('super') && !hasPower('magnet'),'powers expire');
          assert(currentSpeed===settings.easy.speed,'speed restored');
          startGame();clearInterval(timer);
          assert(!Object.keys(powers).length && !plankton && gameTime===0,'restart reset');
        ''')

    def test_magnet_pulls_food_through_obstacles(self):
        self.check('''
          snake=[{x:8,y:10},{x:7,y:10}];powers.magnet=10000;
          food={x:11,y:10,type:'ghost'};obstacles=[{x:10,y:10}];
          moveMagnet();assert(food.x===10 && food.type==='ghost','passes rock');
          moveMagnet();assert(food.x===9,'moves toward head');
          obstacles=[];tick();
          assert(score===10 && hasPower('ghost'),'collect pulled food');
        ''')

    def test_boss_rays_stun_defeat_and_bonus(self):
        self.check('''
          score=190;obstaclePhase=6;scenePhase=1;addScore(10);clearInterval(timer);
          assert(plankton && pendingPlanktons===0,'200-point spawn');
          placeFood();assert(food.type==='normal','boss sequence starts normal');
          const enemyPosition={...plankton};
          const expected=['normal','red','normal','red','normal','red'];
          for(let i=0;i<expected.length;i++) {
            assert(food.type===expected[i],'alternating boss food '+i);
            snake=[{x:8,y:10},{x:7,y:10},{x:6,y:10}];
            direction={x:1,y:0};nextDirection=direction;obstacles=[];
            food.x=9;food.y=10;tick();clearInterval(timer);
            if(expected[i]==='red') {
              assert(beam && beam.until>gameTime,'visible ray');
              if(i<5) {
                assert(plankton.hits===Math.floor((i+1)/2) && plankton.stunnedUntil-gameTime===3000,'hit/stun');
                assert(same(plankton,enemyPosition),'stunned enemy does not move');
              }
            }
          }
          assert(!plankton && score===310,'six foods + 50 bonus');
          assert(food.type!=='red','normal foods restored');
          // Bonus may cross a new boss/scenery/obstacle milestone.
          score=390;scenePhase=3;obstaclePhase=13;addScore(50);clearInterval(timer);
          assert(plankton && scenePhase===4 && obstaclePhase===14,'bonus thresholds');
          addScore(160);clearInterval(timer);
          assert(pendingPlanktons===1,'queue next boss without replacing current');
        ''')

    def test_boss_chase_contact_immunity_and_stun_expiry(self):
        self.check('''
          snake=[{x:8,y:10}];plankton={x:12,y:10,hits:0,stunnedUntil:3000};
          gameTime=1000;bossMoveTime=0;updatePlankton();
          assert(plankton.x===12,'stun holds');
          gameTime=3001;updatePlankton();assert(plankton.x===11,'resumes chase');
          plankton.x=8;plankton.stunnedUntil=5000;updatePlankton();
          assert(!over,'stunned contact safe');
          plankton.stunnedUntil=0;powers.super=10000;updatePlankton();
          assert(!over,'super immune');
          powers={};plankton.x=8;bossMoveTime=0;updatePlankton();
          assert(over,'active contact fatal');
        ''')

    def test_obstacles_safe_food_and_progression(self):
        self.check('''
          for(const level of ['easy','medium','hard']) {
            difficulty=level;startGame();clearInterval(timer);
            assert(obstacles.length===settings[level].obstacles,'obstacle count');
            assert(connectedArena(obstacles),'connected map');
            for(let i=0;i<20;i++) {
              assert(placeFood(),'food available');
              assert(!obstacles.some(o=>same(o,food)) && !snake.some(s=>same(s,food)),'free food');
            }
          }
          difficulty='easy';startGame();clearInterval(timer);
          const initial=obstacles.map(o=>({...o}));
          addScore(30);clearInterval(timer);
          assert(obstaclePhase===1 && !obstacles.some(o=>initial.some(p=>same(o,p))),'relocation');
          addScore(70);clearInterval(timer);
          const first=currentSpeed;
          assert(scenePhase===1 && first<settings.easy.speed,'first speed increase');
          addScore(100);clearInterval(timer);
          assert(scenePhase===2 && currentSpeed<first,'cumulative speed');
          // Torus-aware generation also rejects an isolated empty tile.
          plankton=null;obstacles=[{x:29,y:0},{x:1,y:0},{x:0,y:20},{x:0,y:1}];
          for(let i=0;i<40;i++) {placeFood();assert(!(food.x===0&&food.y===0),'isolated food');}
        ''')

    def test_mobile_console_controls_and_guide(self):
        for width, height in [(390,844),(360,640),(768,1024),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
            self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            board=self.page.locator('#board').bounding_box()
            pad=self.page.locator('.touch-controls').bounding_box()
            up=self.page.locator('[data-dir=up]').bounding_box()
            self.assertGreaterEqual(up['width'],54)
            if height>width:
                self.assertAlmostEqual(pad['x']+pad['width']/2,width/2,delta=1)
                self.assertLess(board['y']+board['height'],pad['y'])
            self.assertGreater(board['height'],100)
            self.assertLessEqual(pad['y']+pad['height'],height)
            self.assertEqual(self.page.locator('#game').evaluate('(el)=>getComputedStyle(el).transform'),'none')
            self.page.locator('[data-dir=up]').click()
            self.assertEqual(self.page.evaluate('nextDirection.y'),-1)
            self.page.evaluate('leaveFullscreen()')
        self.page.locator('#pauseBtn').click()
        self.page.locator('#menuBtn').click()
        self.page.locator('#howBtn').click()
        self.assertEqual(self.page.locator('#howBtn').get_attribute('aria-expanded'),'true')
        self.assertEqual(self.page.locator('.burger-guide li').count(),6)
        self.assertIn('3 segundos',self.page.locator('#howText').inner_text())

    def test_special_food_scarcity_by_difficulty(self):
        self.check('''
          const totals=[];
          for(const level of ['easy','medium','hard']) {
            difficulty=level;
            let specials=0;
            for(let i=0;i<1000;i++) if(chooseFoodType(i/1000,(i%4)/4)!=='normal') specials++;
            totals.push(specials);
          }
          assert(totals.join(',')==='600,220,100','difficulty probabilities');
          plankton={x:20,y:10,hits:0,stunnedUntil:0};
          bossNextFood='normal';assert(chooseFoodType(0)==='normal','boss ignores probability');
          bossNextFood='red';assert(chooseFoodType(.999)==='red','red guaranteed');
        ''')

    def test_plankton_speed_scales_with_difficulty(self):
        self.check('''
          const traveled=[];
          snake=[{x:8,y:10}];
          for(const level of ['easy','medium','hard']) {
            difficulty=level;gameTime=0;
            plankton={x:20,y:10,hits:0,stunnedUntil:0};
            bossMoveTime=settings[level].bossInterval;
            for(let time=0;time<=1000;time++) {gameTime=time;updatePlankton();}
            traveled.push(20-plankton.x);
          }
          assert(traveled.join(',')==='2,3,6','faster medium/hard chase');
        ''')

    def test_continuous_touch_drag_across_direction_pad(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        client=self.page.context.new_cdp_session(self.page)
        client.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':1})
        def touch(kind, direction=None):
            points=[]
            if direction:
                box=self.page.locator(f'[data-dir={direction}]').bounding_box()
                points=[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]
            client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
            if direction:
                self.page.wait_for_function('(direction) => padDirection===direction',arg=direction)
        self.page.evaluate('''() => {
          window.padBoundsReads=0;
          for(const button of directionPad.querySelectorAll('[data-dir]')) {
            const measure=button.getBoundingClientRect.bind(button);
            button.getBoundingClientRect=()=>{window.padBoundsReads++;return measure();};
          }
        }''')
        touch('touchStart','up')
        self.assertEqual(self.page.evaluate('nextDirection.y'),-1)
        self.check('tick();assert(direction.y===-1,"held up");')
        pad=self.page.locator('.touch-controls').bounding_box()
        client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':pad['x']+pad['width']/2,'y':pad['y']+pad['height']/2}]})
        self.page.wait_for_function('padPointer!==null && padDirection===null')
        touch('touchMove','right')
        self.assertEqual(self.page.evaluate('nextDirection.x'),1)
        self.check('tick();assert(direction.x===1,"drag right");')
        touch('touchMove','down')
        self.assertEqual(self.page.evaluate('nextDirection.y'),1)
        self.assertEqual(self.page.locator('[data-dir=down]').get_attribute('class'),'pressed')
        self.assertEqual(self.page.evaluate('padBoundsReads'),4)
        touch('touchEnd')
        self.assertTrue(self.page.evaluate('padPointer===null && padDirection===null'))
        self.assertEqual(self.page.locator('.touch-controls .pressed').count(),0)
        touch('touchStart','up')
        touch('touchCancel')
        self.assertTrue(self.page.evaluate('padPointer===null'))
        client.detach()

    def test_proportions_and_high_dpi_backing_store(self):
        for width,height in [(390,844),(360,640),(1366,768),(844,390)]:
            page=self.browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2)
            try:
                page.goto(f'http://127.0.0.1:{self.server.server_port}/',wait_until='domcontentloaded')
                page.locator('#startBtn').click()
                page.evaluate("clearInterval(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
                page.wait_for_function('''() => {
                  const r=canvas.getBoundingClientRect();
                  return Math.abs(r.width/r.height-COLS/ROWS)<.005 &&
                    Math.abs(canvas.width-r.width*devicePixelRatio)<=1 &&
                    Math.abs(canvas.height-r.height*devicePixelRatio)<=1;
                }''')
                page.evaluate("powers={ghost:8000,drill:8000,super:6000};updateStatus()")
                page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                self.assertEqual(page.locator('.effect-badge').count(),3)
                board=page.locator('#board').bounding_box()
                hud=page.locator('.status-bar').bounding_box()
                self.assertAlmostEqual(board['width']/board['height'],page.evaluate('COLS/ROWS'),delta=.005)
                if height>width:
                    self.assertGreater(board['y'],hud['y']+hud['height'])
                    pad=page.locator('.touch-controls').bounding_box()
                    self.assertLess(board['y']+board['height'],pad['y'])
                self.assertIn('ATIVO',page.locator('#powerStatus').inner_text())
            finally:
                page.close()

    def test_interpolated_animation_and_swapped_visual_effects(self):
        self.check('''
          const mid=interpolateCell({x:29,y:10},{x:0,y:10},.5);
          assert(mid.x===29.5 && mid.y===10,'smooth wrap on short path');
          const xs=[];paintWrapped(mid,(x,y)=>xs.push(x));
          assert(xs.includes(590) && xs.includes(-10),'both sides rendered');
          ctx.save();powers={drill:8000};applyCharacterEffect();
          assert(ctx.globalAlpha<.6,'obstacle power is translucent');ctx.restore();
          ctx.save();powers={ghost:8000};applyCharacterEffect();
          assert(ctx.globalAlpha===1,'body power stays opaque');ctx.restore();
          powers={};
          window.renderSamples=[];
          const originalDraw=draw;
          draw=(alpha,...rest)=>{window.renderSamples.push(alpha);originalDraw(alpha,...rest);};
          tick();
        ''')
        self.page.wait_for_timeout(110)
        self.assertTrue(self.page.evaluate('renderSamples.filter(a=>a>0 && a<1).length>=2'))

    def test_special_food_hint_explains_every_power(self):
        self.check('''
          for(const type of ['ghost','drill','super','magnet','red']) {
            food={x:20,y:15,type};updateStatus();
            assert(foodHint.textContent.includes(foodDescriptions[type]),'food explanation '+type);
            assert(foodHint.textContent.includes('NO MAPA'),'hint context');
          }
        ''')
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("startGame();clearInterval(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        hint=self.page.locator('#foodHint').bounding_box()
        board=self.page.locator('#board').bounding_box()
        self.assertLess(hint['y']+hint['height'],board['y'])
        self.assertEqual(self.page.locator('#foodHint').evaluate('(el)=>getComputedStyle(el).pointerEvents'),'none')

    def test_plankton_health_bar_loses_life_without_visible_numbers(self):
        self.check('''
          score=190;obstaclePhase=6;scenePhase=1;addScore(10);clearInterval(timer);updateStatus();
          assert(!bossHealth.hidden && bossHealth.value===3,'full life');
          for(let hit=1;hit<=3;hit++) {
            food={...snake[0],type:'red'};collectFood();clearInterval(timer);updateStatus();
            assert(bossHealth.value===3-hit && !bossHealth.hidden,'life after ray '+hit);
            assert(!bossStatus.textContent.includes('/3'),'no visible hit count');
            assert(bossHealth.textContent==='', 'no numerical health label');
          }
          assert(bossStatus.textContent.includes('DERROTADO'),'defeat feedback');
          gameTime=beam.until+1;updateStatus();assert(bossHealth.hidden,'hide after defeat');
        ''')

    def test_laser_is_drawn_from_both_animated_eyes(self):
        self.check('''
          previousSnake=[{x:7,y:10}];snake=[{x:8,y:10}];
          beam={to:{x:20,y:10},until:1000};gameTime=0;
          const original=ctx.moveTo;
          try {
            for(const person of ['bob','patrick']) {
              character=person;
              const eyes=getEyeOrigins(.5), starts=[];
              ctx.moveTo=function(x,y){starts.push({x,y});original.call(ctx,x,y);};
              drawEyeLaser(.5);
              assert(starts.length===2 && starts.every((p,i)=>same(p,eyes[i])),'two eye beams');
              assert(eyes[0].x===170+(person==='bob'?7.5:8),'animated head origin');
              assert(eyes[0].y===200+(person==='bob'?7:9),'character eye height');
            }
            const starts=[];ctx.moveTo=(x,y)=>starts.push({x,y});
            gameTime=1001;drawEyeLaser();assert(!starts.length,'ray expires');
          } finally {ctx.moveTo=original;}
        ''')

    def test_mobile_map_uses_available_area_above_controls(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("startGame();clearInterval(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        board=self.page.locator('#board').bounding_box()
        pad=self.page.locator('.touch-controls').bounding_box()
        self.assertGreater(board['width'],360)
        self.assertGreater(board['height'],360)  # Antes: aproximadamente 315 × 220px.
        self.assertAlmostEqual(board['width']/board['height'],self.page.evaluate('COLS/ROWS'),delta=.005)
        self.assertGreaterEqual(844-(pad['y']+pad['height']),55)
        self.assertLess(board['y']+board['height'],pad['y'])

    def test_map_geometry_stable_on_power_pickup_and_expiry(self):
        for width,height in [(1366,768),(390,844),(360,640),(844,390)]:
            for fullscreen in [False,True]:
                self.page.set_viewport_size({'width':width,'height':height})
                self.page.evaluate('''full => {
                  game.classList.toggle('fallback-fullscreen',full);
                  powers={};updateStatus();resizeBoardForViewport();
                }''',fullscreen)
                self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                baseline=self.page.locator('#board').bounding_box()
                for kind in ['ghost','drill','super','magnet',None]:
                    self.page.evaluate('''type => {
                      if(type) {food={...snake[0],type};collectFood();clearInterval(timer);}
                      else powers={};
                      updateStatus();
                    }''',kind)
                    self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                    current=self.page.locator('#board').bounding_box()
                    for key in ['x','y','width','height']:
                        self.assertAlmostEqual(current[key],baseline[key],delta=.1,msg=f'{width}x{height} fullscreen={fullscreen}, power={kind}, {key}')
                    self.assertEqual(self.page.locator('#powerStatus').is_visible(),kind is not None)

    def test_power_overlay_stays_top_left_and_does_not_capture_input(self):
        self.check('''
          powers={ghost:8000};obstacles=[];food={x:15,y:10,type:'normal'};
          snake=[{x:0,y:0}];powerStatus.dataset.corner='top-left';updateStatus();
          assert(powerStatus.closest('.board-wrap'),'overlay inside map');
          assert(powerStatus.dataset.corner==='top-left','fixed above head');
          snake=[{x:29,y:20}];updateStatus();
          assert(powerStatus.dataset.corner==='top-left','fixed when player moves');
          assert(parseFloat(getComputedStyle(powerStatus.querySelector('strong')).fontSize)>=14,'larger label');
          assert(getComputedStyle(powerStatus).pointerEvents==='none','input passes through');
          powers={};updateStatus();assert(powerStatus.hidden,'hide without powers');
        ''')

    def test_three_power_limit_blocks_specials_until_expiry(self):
        self.check('''
          for(const type of ['ghost','drill','super']) {
            food={...snake[0],type};collectFood();clearInterval(timer);
          }
          assert(activePowerTypes().length===3,'three simultaneous powers');
          for(let i=0;i<20;i++) {
            assert(chooseFoodType(0,i/20)==='normal','no specials at cap');
            placeFood();assert(food.type==='normal','normal spawn at cap');
          }
          food={...snake[0],type:'magnet'};collectFood();clearInterval(timer);
          assert(!hasPower('magnet') && activePowerTypes().length===3,'fourth power rejected');
          gameTime=6001;
          assert(activePowerTypes().length===2 && chooseFoodType(0,.9)==='magnet','specials return after expiry');
          food={...snake[0],type:'magnet'};collectFood();clearInterval(timer);
          assert(hasPower('magnet') && activePowerTypes().length===3,'freed slot reused');
          plankton={x:20,y:15,hits:0,stunnedUntil:0};bossNextFood='red';
          assert(chooseFoodType(0)==='red','boss red remains available at cap');
          bossNextFood='normal';assert(chooseFoodType(0)==='normal','boss alternation preserved');
        ''')

    def test_fast_turns_are_buffered_without_reversing_or_changing_speed(self):
        self.check('''
          const speed=currentSpeed;
          setDirection('up');setDirection('left');
          assert(directionQueue.length===2,'two quick turns retained');
          tick();assert(direction.y===-1 && snake[0].y===9,'first turn applied');
          assert(motionDuration===speed && currentSpeed===speed,'continuous movement without stop/go at turns');
          tick();assert(direction.x===-1 && snake[0].x===7,'second turn applied');
          setDirection('right');assert(directionQueue.length===0,'reverse rejected');
          // A new valid command corrects the pending turn instead of being dropped.
          setDirection('up');setDirection('right');setDirection('down');
          tick();
          assert(direction.y===1,'latest valid turn is not lost');
          paused=true;setDirection('left');assert(!directionQueue.length,'paused input ignored');
        ''')

    def test_mobile_grid_has_fewer_larger_cells_and_keeps_rules(self):
        page=self.browser.new_page(viewport={'width':390,'height':844})
        try:
            page.goto(f'http://127.0.0.1:{self.server.server_port}/',wait_until='domcontentloaded')
            page.evaluate('''() => {
              const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
              for(const level of ['easy','medium','hard']) {
                difficulty=level;startGame();clearInterval(timer);
                assert(COLS===18 && ROWS===18,'mobile 18x18');
                assert(obstacles.length===obstacleCount() && connectedArena(obstacles),'obstacle density and connectivity');
                for(let i=0;i<10;i++) {
                  assert(placeFood() && food.x<COLS && food.y<ROWS,'food inside reduced grid');
                  assert(!obstacles.some(o=>same(o,food)),'safe food');
                }
              }
              obstacles=[];food={x:5,y:5,type:'normal'};snake=[{x:17,y:10}];
              direction=nextDirection={x:1,y:0};tick();clearInterval(timer);
              assert(snake[0].x===0 && !over,'horizontal portal on reduced grid');
              snake=[{x:10,y:17}];direction=nextDirection={x:0,y:1};tick();clearInterval(timer);
              assert(snake[0].y===0 && !over,'vertical portal on reduced grid');
            }''')
            page.set_viewport_size({'width':1366,'height':768})
            self.assertEqual(page.evaluate('[COLS,ROWS]'),[18,18])
            page.evaluate('startGame();clearInterval(timer)')
            self.assertEqual(page.evaluate('[COLS,ROWS]'),[30,21])
        finally:
            page.close()

    def test_renderer_reuses_scene_and_glow_sprites_between_frames(self):
        self.check('''
          powers={ghost:8000,super:6000};
          draw(.2);
          const scene=renderStats.sceneBuilds,sprites=renderStats.spriteBuilds;
          for(let frame=0;frame<20;frame++)draw(frame/20);
          assert(renderStats.sceneBuilds===scene,'no background/obstacle rebuild per frame');
          assert(renderStats.spriteBuilds===sprites,'no repeated glow rasterization');
          scenePhase++;draw(.5);
          assert(renderStats.sceneBuilds===scene+1,'scene changes invalidate cache');
          powers={drill:8000};draw(.5);
          assert(renderStats.spriteBuilds>sprites,'power visuals invalidate sprites');
        ''')

    def test_touch_turn_retargets_visible_head_before_next_tick(self):
        self.check('''
          directionQueue=[];direction=nextDirection={x:1,y:0};inputMotion=null;
          snake=[{x:8,y:10},{x:7,y:10}];lastVisualPositions=[];
          motionDuration=currentSpeed;lastMoveAt=performance.now()-currentSpeed*.4;
          const time=gameTime;
          setDirection('up');
          const motion=inputMotion;
          assert(motion && directionQueue.length===1,'turn is immediately visible');
          const start=getVisualHead(0,motion.startedAt);
          assert(Math.abs(start.x-motion.from.x)<.0001 && Math.abs(start.y-motion.from.y)<.0001,'no jump at touch');
          const mid=getVisualHead(.5,motion.startedAt+motion.duration/2);
          assert(mid.y<10 && mid.y>9,'turn starts before logical movement');
          assert(snake[0].x===8 && snake[0].y===10 && gameTime===time,'same game speed');
          const end=getVisualHead(1,motion.startedAt+motion.duration);
          assert(Math.abs(end.x-8)<.0001 && Math.abs(end.y-9)<.0001,'continuous turn endpoint');
        ''')

    def test_animation_does_not_lag_one_cell_behind(self):
        self.check('''
          directionQueue=[];direction=nextDirection={x:1,y:0};inputMotion=null;
          snake=[{x:8,y:10},{x:7,y:10}];lastVisualPositions=[];
          const midway=visualSnakePositions(.5,performance.now());
          assert(midway[0].x===8.5 && midway[1].x===7.5,'draws current step');
          const end=getVisualHead(1);tick();
          const start=getVisualHead(0);
          assert(same(start,end),'no jump between simulation steps');
        ''')

    def test_pause_freezes_animation_and_resumes_same_curve(self):
        self.check('''
          lastMoveAt=performance.now()-currentSpeed*.3;
          setDirection('up');togglePause();
          window.frozenSnake=visualSnakePositions(.5,performance.now()).map(p=>({...p}));
          window.frozenTime=gameTime;
          assert(directionQueue.length===1,'queued curve preserved');
        ''')
        self.page.wait_for_timeout(130)
        self.check('''
          const still=visualSnakePositions(1,performance.now());
          assert(gameTime===window.frozenTime && still.every((p,i)=>same(p,window.frozenSnake[i])),'pause freezes visuals and timer');
          togglePause();clearTimeout(timer);
          const resumed=getVisualHead(movementProgress());
          assert(Math.abs(resumed.x-window.frozenSnake[0].x)<.04 && Math.abs(resumed.y-window.frozenSnake[0].y)<.04,'resume without snapping');
        ''')

    def test_pause_at_top_right_and_transparent_power_indicators(self):
        for width,height in [(1366,768),(390,844),(360,640),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport();powers={ghost:8000};updateStatus()")
            self.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            pause=self.page.locator('#pauseBtn').bounding_box()
            leave=self.page.locator('#fullscreenBtn').bounding_box()
            self.assertGreater(pause['x'],width-65)
            self.assertLessEqual(pause['y'],25)
            self.assertLess(leave['x']+leave['width'],pause['x'])
            opacity=float(self.page.locator('#powerStatus').evaluate('(el)=>getComputedStyle(el).opacity'))
            self.assertGreaterEqual(opacity,.75)
            self.assertLessEqual(opacity,.85)
            self.page.evaluate('leaveFullscreen()')

    def test_mute_from_pause_persists_after_reload(self):
        self.page.locator('#pauseBtn').click()
        mute=self.page.locator('#muteMusicBtn')
        self.assertTrue(mute.is_visible())
        mute.click()
        self.assertEqual(mute.get_attribute('aria-pressed'),'true')
        self.assertTrue(self.page.evaluate('Object.values(musicas).every(m=>m.muted)'))
        self.page.locator('#resumeBtn').click()
        self.page.evaluate('clearTimeout(timer)')
        self.assertTrue(self.page.evaluate('musicaAtual.muted'))
        self.page.reload(wait_until='domcontentloaded')
        self.page.locator('#startBtn').click()
        self.page.evaluate('clearTimeout(timer)')
        self.page.locator('#pauseBtn').click()
        self.assertEqual(mute.get_attribute('aria-pressed'),'true')
        mute.click()
        self.assertTrue(self.page.evaluate('Object.values(musicas).every(m=>!m.muted) && paused'))
        self.assertEqual(mute.get_attribute('aria-pressed'),'false')

    def test_audio_resume_does_not_restart_track(self):
        self.check('''
          const track={paused:true,currentTime:23,muted:false,
            play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
          musicas[difficulty]=track;musicaAtual=track;musicMuted=true;
          tocarMusica();
          assert(track.currentTime===23 && track.muted && !track.paused,'resume track at saved position');
        ''')

    def test_latest_valid_lateral_command_replaces_stale_buffer(self):
        self.check('''
          setDirection('up');setDirection('left');setDirection('right');
          assert(directionQueue.length===2 && directionQueue[1].x===1,'latest valid side turn accepted');
          tick();tick();
          assert(direction.x===1,'latest lateral movement executed');
          setDirection('down');setDirection('up');
          assert(directionQueue.length===1 && directionQueue[0].y===-1,'opposite pending turn can be corrected before commit');
        ''')

    def test_rejected_held_direction_does_not_reappear_after_turn(self):
        self.check('''
          padDirection='left';setDirection('left');setDirection('up');
          tick();padDirection=null;
          assert(direction.y===-1 && !directionQueue.length,'rejected reverse never becomes a phantom turn');
        ''')

    def test_keyboard_autorepeat_does_not_insert_unwanted_turn(self):
        self.check('''
          setDirection('up');
          document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,bubbles:true}));
          assert(directionQueue.length===1 && directionQueue[0].y===-1,'repeat ignored during queued turn');
        ''')

    def test_neutral_inputs_do_not_change_motion_or_clock(self):
        self.check('''
          const stamp=lastMoveAt,duration=motionDuration,clock=gameTime,scheduled=timer;
          const from=getVisualHead(.4,lastMoveAt+duration*.4);
          for(let i=0;i<30;i++){setDirection('right');setDirection('left');}
          const to=getVisualHead(.4,lastMoveAt+duration*.4);
          assert(same(from,to) && !inputMotion && !directionQueue.length,'neutral inputs leave animation untouched');
          assert(lastMoveAt===stamp && motionDuration===duration && gameTime===clock && timer===scheduled,'no timer reset or extra movement');
        ''')

    def test_second_finger_can_take_control_of_lateral_movement(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("snake=[{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13}];direction=nextDirection={x:0,y:-1};game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        client=self.page.context.new_cdp_session(self.page)
        client.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
        def point(direction, identifier):
            box=self.page.locator(f'[data-dir={direction}]').bounding_box()
            return {'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':identifier}
        up=point('up',1)
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[up]})
        first=self.page.evaluate('padPointer')
        left=point('left',2)
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[up,left]})
        self.page.wait_for_function("padDirection==='left' && nextDirection.x===-1")
        self.assertNotEqual(self.page.evaluate('padPointer'),first)
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[up]})
        self.assertEqual(self.page.evaluate('padDirection'),'left')
        self.check('tick();assert(direction.x===-1 && !over,"second touch steers left safely");')
        # Fallback works even if a browser advertises raw events without delivering them.
        self.page.evaluate('''() => {
          const r=document.querySelector('[data-dir=down]').getBoundingClientRect();
          directionPad.dispatchEvent(new PointerEvent('pointermove',{
            pointerId:padPointer,pointerType:'touch',bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2
          }));
        }''')
        self.assertEqual(self.page.evaluate('nextDirection.y'),1)
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        self.assertTrue(self.page.evaluate('padPointer===null'))
        client.detach()

    def test_effects_are_real_synthesized_waveforms_without_clipping(self):
        result=self.page.evaluate('''async () => {
          const results={};
          for(const kind of ['collect','laser','death']) {
            const context=new OfflineAudioContext(1,30870,44100);
            const output=context.createGain();output.gain.value=.32;output.connect(context.destination);
            scheduleEffectNotes(context,output,kind);
            const buffer=await context.startRendering(), samples=buffer.getChannelData(0);
            let peak=0,energy=0,tail=0;
            for(let i=0;i<samples.length;i++) {
              peak=Math.max(peak,Math.abs(samples[i]));energy+=samples[i]*samples[i];
              if(i>26460)tail+=samples[i]*samples[i];
            }
            results[kind]={peak,energy,tail};
          }
          return results;
        }''')
        for kind,stats in result.items():
            self.assertGreater(stats['energy'],.01,kind)
            self.assertGreater(stats['peak'],.01,kind)
            self.assertLess(stats['peak'],.5,kind)
            self.assertLess(stats['tail'],.0001,kind)
        self.assertNotAlmostEqual(result['collect']['energy'],result['death']['energy'],delta=.01)

    def test_game_events_trigger_collection_laser_and_death_once(self):
        self.check('''
          const events=[],original=playEffect;playEffect=kind=>events.push(kind);
          try {
            food={...snake[0],type:'normal'};collectFood();clearTimeout(timer);
            plankton={x:20,y:15,hits:0,stunnedUntil:0};
            food={...snake[0],type:'red'};collectFood();clearTimeout(timer);
            endGame();endGame();
            assert(events.join(',')==='collect,collect,laser,death','effects attached to the correct events');
          } finally {playEffect=original;}
        ''')

    def test_music_effects_and_master_mutes_are_independent_and_persistent(self):
        self.page.locator('#pauseBtn').click()
        self.page.locator('#muteEffectsBtn').click()
        self.check('''
          assert(effectsMuted && !musicMuted && !allMuted,'only effects muted');
          assert(Object.values(musicas).every(m=>!m.muted),'music unchanged');
          playEffect('laser');assert(!activeEffects.size,'muted effects do not allocate voices');
        ''')
        self.page.locator('#muteAllBtn').click()
        self.check('''
          assert(allMuted && Object.values(musicas).every(m=>m.muted),'master silences music');
          playEffect('death');assert(!activeEffects.size,'master silences effects');
        ''')
        self.page.reload(wait_until='domcontentloaded')
        self.page.locator('#startBtn').click()
        self.page.evaluate('clearTimeout(timer)')
        self.page.locator('#pauseBtn').click()
        self.assertEqual(self.page.locator('#muteAllBtn').get_attribute('aria-pressed'),'true')
        self.assertEqual(self.page.locator('#muteEffectsBtn').get_attribute('aria-pressed'),'true')
        self.page.locator('#muteAllBtn').click()
        self.assertTrue(self.page.evaluate('!allMuted && effectsMuted && Object.values(musicas).every(m=>!m.muted)'))
        self.page.locator('#muteMusicBtn').click()
        self.page.locator('#muteEffectsBtn').click()
        self.assertTrue(self.page.evaluate('musicMuted && !effectsMuted && Object.values(musicas).every(m=>m.muted)'))
        self.page.wait_for_function("effectsContext.state==='running'")
        self.check('''
          playEffect('collect');assert(activeEffects.size===2,'effects play with music muted');
        ''')
        self.page.locator('#muteEffectsBtn').click()
        self.assertEqual(self.page.evaluate('activeEffects.size'),0)

    def test_native_fullscreen_and_exit_to_menu(self):
        self.page.locator('#fullscreenBtn').click()
        self.page.wait_for_function('document.fullscreenElement === game')
        self.page.wait_for_function('''() => {
          const r=canvas.getBoundingClientRect();
          return Math.abs(r.width/r.height-COLS/ROWS)<.005 &&
            Math.abs(canvas.width-r.width*devicePixelRatio)<=1;
        }''')
        self.page.locator('#pauseBtn').click()
        self.page.locator('#menuBtn').click()
        self.page.wait_for_function('!document.fullscreenElement')
        self.assertTrue(self.page.locator('#menu').is_visible())


if __name__ == '__main__':
    unittest.main()
