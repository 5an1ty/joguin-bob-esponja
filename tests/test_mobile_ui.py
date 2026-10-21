import functools,http.server,threading
from playwright.sync_api import sync_playwright
from pathlib import Path
root=str(Path(__file__).resolve().parents[1])
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass

import unittest

class MobileInterfaceTests(unittest.TestCase):
 def test_mobile_gestures_layout_and_onboarding(self):
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=root))
  threading.Thread(target=server.serve_forever,daemon=True).start()
  with sync_playwright() as p:
   b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=b.new_page(viewport={'width':390,'height':844},has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/')
   page.evaluate("localStorage.setItem('bobSnakeBattlePlayableTutorialSeen','true')")
   page.locator('#startBtn').click()
   page.evaluate("clearTimeout(timer);obstacles=[]")
   assert page.evaluate('!paused && movementGuide!==null')
   # Accelerate only the guide clock to prove the demonstration does not restart the phase.
   page.evaluate('score=50;movementGuide.startedAt-=1900;updateMovementGuide(performance.now());clearTimeout(timer)')
   assert page.evaluate("movementGuide.phase==='practice' && score===50 && !paused")
   # Real pointer drag produces two distinct turns without pointerup.
   page.evaluate("direction={x:1,y:0};nextDirection={...direction};directionQueue=[]")
   page.locator('#board').dispatch_event('pointerdown',{'pointerId':42,'pointerType':'touch','clientX':100,'clientY':100})
   page.locator('#board').dispatch_event('pointermove',{'pointerId':42,'pointerType':'touch','clientX':100,'clientY':130})
   page.locator('#board').dispatch_event('pointermove',{'pointerId':42,'pointerType':'touch','clientX':135,'clientY':130})
   assert page.evaluate("directionQueue.map(d=>`${d.x},${d.y}`).join(';')==='0,1;1,0'")
   assert page.evaluate("movementGuide.phase==='finish' && localStorage.getItem('bobSnakeDragLearned')==='true'")
   page.locator('#board').dispatch_event('pointercancel',{'pointerId':42,'pointerType':'touch'})
   assert page.evaluate('dragPointer===null')
   page.evaluate("goMenu();gameMode='battle';startGame({skipTutorial:true,skipMovementGuide:true});clearTimeout(timer)")
   for width,height in [(390,844),(320,568),(768,1024),(844,390)]:
    page.set_viewport_size({'width':width,'height':height})
    page.evaluate("game.classList.add('fallback-fullscreen');resizeBoardForViewport();clearTimeout(timer)")
    page.wait_for_timeout(100)
    box=page.locator('.board-wrap').bounding_box();header=page.locator('.game-head').bounding_box();power=page.locator('#abilityBtn').bounding_box()
    assert box['y']>=header['y']+header['height'],(width,box,header)
    assert box['y']+box['height']<=power['y'],(width,box,power)
    assert power['width']>=width-30 and power['height']>=64
    assert page.locator('.touch-controls').is_hidden()
    controls=[page.locator(x).bounding_box() for x in ['#restartBtn','#topPauseBtn','#fullscreenBtn']]
    assert all(x['y']+x['height']<box['y'] and x['x']>=0 and x['x']+x['width']<=width for x in controls),(width,controls,box)
    assert page.locator('#abilityBtn').evaluate("el=>el.classList.contains('ability-ready')")
   page.set_viewport_size({'width':390,'height':844});page.evaluate('resizeBoardForViewport()');page.wait_for_timeout(100)
  
   # Restart is immediate even when paused and does not enter onboarding.
   page.locator('#topPauseBtn').click();assert page.evaluate('paused')
   page.evaluate('score=90')
   page.locator('#overlayRestartBtn').click()
   assert page.evaluate('!paused && !over && score===0 && !playableTutorial && !movementGuide')
   page.evaluate("clearTimeout(timer);goMenu();localStorage.removeItem('bobSnakeDragLearned');beginPlayableTutorial();clearTimeout(timer)")
   assert page.evaluate("playableTutorial.lessonPhase==='demo' && !paused")
   page.evaluate("triggerTutorialLesson('food');tutorialSlowdown.startedAt-=1200;updateTutorialSlowdown(performance.now());clearTimeout(timer)")
   assert page.evaluate("playableTutorial.lessonPhase==='practice' && !paused && movementGuide!==null")
   page.evaluate("stopMovementGuide();prepareTutorialLesson(1);clearTimeout(timer);playableTutorial.demoStartedAt-=1000;updateTutorialSlowdown(performance.now());clearTimeout(timer)")
   assert page.evaluate('abilityReadyAt>0 && tutorialSlowdown!==null')
   # Each demonstration must actually reach practice without user input.
   page.evaluate("localStorage.setItem('bobSnakeDragLearned','true')")
   for stage in range(5):
    page.evaluate('(stage)=>prepareTutorialLesson(stage)',stage)
    page.wait_for_function("playableTutorial.lessonPhase==='practice'",timeout=8000)
    assert page.evaluate('!paused && !over')
   assert not errors,errors
   print('PASS: continuous drag/cancel, non-pausing guide and preserved score, 4 fullscreen layouts, power neon, immediate restart, demonstration before practice.')
   b.close()
  server.shutdown()
  server.server_close()
