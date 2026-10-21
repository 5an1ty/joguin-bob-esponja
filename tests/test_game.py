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
          placeFood();assert(food.type==='red','red supplied during boss');
          const enemyPosition={...plankton};
          for(let hit=1;hit<=3;hit++) {
            snake=[{x:8,y:10},{x:7,y:10},{x:6,y:10}];
            direction={x:1,y:0};nextDirection=direction;obstacles=[];
            food={x:9,y:10,type:'red'};tick();clearInterval(timer);
            assert(beam && beam.until>gameTime,'visible ray');
            if(hit<3) {
              assert(plankton.hits===hit && plankton.stunnedUntil-gameTime===3000,'hit/stun');
              assert(same(plankton,enemyPosition),'stunned enemy does not move');
            }
          }
          assert(!plankton && score===280,'three red + 50 bonus');
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
            self.page.locator('[data-dir=up]').dispatch_event('pointerdown')
            self.assertEqual(self.page.evaluate('nextDirection.y'),-1)
            self.page.evaluate('leaveFullscreen()')
        self.page.locator('#pauseBtn').click()
        self.page.locator('#menuBtn').click()
        self.page.locator('#howBtn').click()
        self.assertEqual(self.page.locator('#howBtn').get_attribute('aria-expanded'),'true')
        self.assertEqual(self.page.locator('.burger-guide li').count(),6)
        self.assertIn('3 segundos',self.page.locator('#howText').inner_text())

    def test_native_fullscreen_and_exit_to_menu(self):
        self.page.locator('#fullscreenBtn').click()
        self.page.wait_for_function('document.fullscreenElement === game')
        self.page.locator('#pauseBtn').click()
        self.page.locator('#menuBtn').click()
        self.page.wait_for_function('!document.fullscreenElement')
        self.assertTrue(self.page.locator('#menu').is_visible())


if __name__ == '__main__':
    unittest.main()
