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
          for(const type of ['ghost','drill','super','magnet']) {
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
                  return Math.abs(r.width/r.height-30/21)<.005 &&
                    Math.abs(canvas.width-r.width*devicePixelRatio)<=1 &&
                    Math.abs(canvas.height-r.height*devicePixelRatio)<=1;
                }''')
                page.evaluate("powers={ghost:8000,drill:8000,super:6000,magnet:10000};updateStatus()")
                page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                self.assertEqual(page.locator('.effect-badge').count(),4)
                board=page.locator('#board').bounding_box()
                hud=page.locator('.status-bar').bounding_box()
                self.assertAlmostEqual(board['width']/board['height'],30/21,delta=.005)
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

    def test_native_fullscreen_and_exit_to_menu(self):
        self.page.locator('#fullscreenBtn').click()
        self.page.wait_for_function('document.fullscreenElement === game')
        self.page.wait_for_function('''() => {
          const r=canvas.getBoundingClientRect();
          return Math.abs(r.width/r.height-30/21)<.005 &&
            Math.abs(canvas.width-r.width*devicePixelRatio)<=1;
        }''')
        self.page.locator('#pauseBtn').click()
        self.page.locator('#menuBtn').click()
        self.page.wait_for_function('!document.fullscreenElement')
        self.assertTrue(self.page.locator('#menu').is_visible())


if __name__ == '__main__':
    unittest.main()
