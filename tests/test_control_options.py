import functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

import unittest

class ControlOptionsTests(unittest.TestCase):
 def test_controls_double_tap_fullscreen_and_preferences(self):
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path(__file__).resolve().parents[1])))
  threading.Thread(target=server.serve_forever,daemon=True).start()
  with sync_playwright() as p:
   b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/')
   page.evaluate("localStorage.setItem('bobSnakeBattlePlayableTutorialSeen','true');localStorage.setItem('bobSnakeDragLearned','true')")
   assert page.locator('button[data-control=swipe]').get_attribute('aria-pressed')=='true'
   assert not page.locator('#showPowerButton').is_checked()
   page.locator('[data-mode=battle]').click();page.locator('#startBtn').click()
   page.evaluate("clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
   page.wait_for_timeout(100)
   assert page.locator('#abilityBtn').is_hidden() and page.locator('.touch-controls').is_hidden() and page.locator('#joystick').is_hidden()
   def tap(i,x=180,y=300):
    page.locator('#board').dispatch_event('pointerdown',{'pointerId':i,'pointerType':'touch','clientX':x,'clientY':y})
    page.locator('#board').dispatch_event('pointerup',{'pointerId':i,'pointerType':'touch','clientX':x,'clientY':y})
   page.evaluate('obstacles=[];battleEnemies=[];abilityReadyAt=0;direction={x:1,y:0};nextDirection={...direction};directionQueue=[];')
   tap(1);assert page.evaluate('abilityReadyAt===0')
   tap(2);assert page.evaluate('abilityReadyAt>gameTime')
   # A swipe cannot become the first tap of an ability gesture.
   page.evaluate('abilityReadyAt=0;resetMobileInput()')
   page.locator('#board').dispatch_event('pointerdown',{'pointerId':3,'pointerType':'touch','clientX':100,'clientY':200})
   page.locator('#board').dispatch_event('pointermove',{'pointerId':3,'pointerType':'touch','clientX':100,'clientY':240})
   page.locator('#board').dispatch_event('pointerup',{'pointerId':3,'pointerType':'touch','clientX':100,'clientY':240})
   tap(4);assert page.evaluate('abilityReadyAt===0')
   page.evaluate('resetMobileInput()')
   # One long hold also cannot become the first tap.
   page.locator('#board').dispatch_event('pointerdown',{'pointerId':5,'pointerType':'touch','clientX':180,'clientY':300})
   page.evaluate('powerTapPointers.get(5).at-=500')
   page.locator('#board').dispatch_event('pointerup',{'pointerId':5,'pointerType':'touch','clientX':180,'clientY':300})
   tap(6);assert page.evaluate('abilityReadyAt===0')
   # Simultaneous fingers and cancelled touches do not count as a double tap.
   page.evaluate('abilityReadyAt=0;resetMobileInput()')
   for pointer in [20,21]:
    page.locator('#board').dispatch_event('pointerdown',{'pointerId':pointer,'pointerType':'touch','clientX':180,'clientY':300})
   for pointer in [20,21]:
    page.locator('#board').dispatch_event('pointerup',{'pointerId':pointer,'pointerType':'touch','clientX':180,'clientY':300})
   assert page.evaluate('abilityReadyAt===0')
   page.locator('#board').dispatch_event('pointerdown',{'pointerId':22,'pointerType':'touch','clientX':180,'clientY':300})
   page.locator('#board').dispatch_event('pointercancel',{'pointerId':22,'pointerType':'touch'})
   tap(23);assert page.evaluate('abilityReadyAt===0')
   page.evaluate('resetMobileInput()');tap(24)
   page.evaluate('lastPowerTap.at-=400');tap(25)
   assert page.evaluate('abilityReadyAt===0')
   for mode in ['joystick','dpad','swipe']:
    page.evaluate('goMenu()');page.locator(f'button[data-control={mode}]').click()
    page.locator('#showPowerButton').check();page.locator('#startBtn').click()
    page.evaluate("clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
    page.wait_for_timeout(100)
    assert page.locator('#abilityBtn').is_visible()
    assert page.locator('#joystick').is_visible()==(mode=='joystick')
    assert page.locator('.touch-controls').is_visible()==(mode=='dpad')
    page.evaluate("obstacles=[];direction={x:1,y:0};nextDirection={...direction};directionQueue=[]")
    if mode=='joystick':
     rect=page.locator('#joystick').bounding_box();cx=rect['x']+rect['width']/2;cy=rect['y']+rect['height']/2
     page.locator('#joystick').dispatch_event('pointerdown',{'pointerId':7,'pointerType':'touch','clientX':cx,'clientY':cy-40})
     assert page.evaluate('nextDirection.y===-1')
     page.locator('#joystick').dispatch_event('pointermove',{'pointerId':7,'pointerType':'touch','clientX':cx+40,'clientY':cy})
     assert page.evaluate('directionQueue.length===2')
     page.locator('#joystick').dispatch_event('pointercancel',{'pointerId':7,'pointerType':'touch'})
     assert page.evaluate('joystickPointer===null')
    if mode=='dpad':
     rect=page.locator('[data-dir=up]').bounding_box()
     page.locator('[data-dir=up]').dispatch_event('pointerdown',{'pointerId':8,'pointerType':'touch','clientX':rect['x']+rect['width']/2,'clientY':rect['y']-7})
     assert page.evaluate('nextDirection.y===-1')
     page.evaluate('clearPadPointer()')
    pause=page.locator('#topPauseBtn').bounding_box();assert pause['width']>300 and pause['y']>700
    # Layout fills all pixels, including after rotations with a live snake.
    for width,height in [(320,568),(390,844),(844,390),(768,1024)]:
     page.set_viewport_size({'width':width,'height':height});page.evaluate('resizeBoardForViewport()');page.wait_for_timeout(70)
     box=page.locator('#board').bounding_box()
     assert abs(box['x'])<1 and abs(box['y'])<1 and abs(box['width']-width)<1 and abs(box['height']-height)<1,(mode,width,box)
     page.evaluate('clearTimeout(timer)')
     assert page.evaluate('snake.every(p=>p.x>=0&&p.x<COLS&&p.y>=0&&p.y<ROWS) && new Set(snake.map(cellKey)).size===snake.length')
     assert page.evaluate('placeFood() && !foodUnderMobileControls(food) && !snake.some(p=>same(p,food))')
    page.set_viewport_size({'width':390,'height':844});page.evaluate('resizeBoardForViewport()');page.wait_for_timeout(80)
  
   page.locator('#topPauseBtn').click();assert page.evaluate('paused')
   page.locator('#topPauseBtn').click();assert page.evaluate('!paused')
   page.evaluate('score=123;clearTimeout(timer)');page.locator('#restartBtn').click()
   assert page.evaluate('score===0 && !paused && !playableTutorial')
   page.evaluate('goMenu()');page.reload()
   assert page.locator('button[data-control=swipe]').get_attribute('aria-pressed')=='true'
   assert page.locator('#showPowerButton').is_checked()
   assert not errors,errors
   print('PASS: control choices and persistence, joystick/D-Pad/drag, tap power and drag/hold rejection, 12 full-screen layouts, safe reflow/food, lower pause and immediate restart.')
   b.close()
  server.shutdown();server.server_close()
