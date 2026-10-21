"""Escolha de orientação, fallback e ações do menu de pausa."""
import functools
import http.server
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class OrientationTests(unittest.TestCase):
    def test_orientation_choice_cancel_rotation_and_pause_actions(self):
        root=Path(__file__).resolve().parents[1]
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':390,'height':844},has_touch=True)
            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.evaluate("localStorage.setItem('bobSnakeDragLearned','true');localStorage.setItem('bobSnakeBattlePlayableTutorialSeen','true')")
            page.locator('button[data-control=joystick]').click()
            page.locator('#startBtn').click()
            page.evaluate('score=77;clearTimeout(timer)')
            page.locator('#fullscreenBtn').click()
            self.assertTrue(page.locator('#orientationDialog').is_visible())
            self.assertTrue(page.evaluate('paused && score===77'))
            page.locator('#cancelOrientation').click()
            self.assertTrue(page.evaluate('!paused && score===77 && !isFullscreen()'))
            page.evaluate('clearTimeout(timer)')
            # A browser without orientation lock asks for physical rotation.
            page.evaluate("Object.defineProperty(screen.orientation,'lock',{configurable:true,value:async()=>{throw Error('unsupported')}})")
            page.locator('#fullscreenBtn').click()
            page.locator('[data-orientation=landscape]').click()
            page.wait_for_function("isFullscreen() && preferredFullscreenOrientation==='landscape'")
            self.assertTrue(page.evaluate('paused'))
            self.assertTrue(page.locator('#orientationHint').is_visible())
            page.set_viewport_size({'width':844,'height':390})
            page.wait_for_function('!paused && orientationHint.hidden')
            page.evaluate('clearTimeout(timer)')
            joy=page.locator('#joystick').bounding_box()
            self.assertLessEqual(joy['x'],16)
            self.assertGreater(joy['y'],150)
            self.assertTrue(page.evaluate('score===77'))
            page.locator('#fullscreenBtn').click()
            page.wait_for_function('!isFullscreen()')
            self.assertTrue(page.evaluate('preferredFullscreenOrientation===null'))
            # Supported lock receives the selected orientation.
            page.evaluate("Object.defineProperty(screen.orientation,'lock',{configurable:true,value:async value=>{window.requestedOrientation=value}})")
            page.locator('#fullscreenBtn').click()
            page.locator('[data-orientation=landscape]').click()
            page.wait_for_function("window.requestedOrientation==='landscape' && !paused")
            page.evaluate('clearTimeout(timer)')
            page.locator('#topPauseBtn').click()
            restart=page.locator('#overlayRestartBtn').bounding_box()
            resume=page.locator('#resumeBtn').bounding_box()
            self.assertLess(restart['y'],resume['y'])
            page.locator('#resumeBtn').click()
            self.assertTrue(page.evaluate('!paused && score===77'))
            page.evaluate('clearTimeout(timer)')
            page.locator('#topPauseBtn').click()
            page.locator('#overlayRestartBtn').click()
            self.assertTrue(page.evaluate('score===0 && !paused'))
            page.evaluate('clearTimeout(timer);goMenu()')
            page.wait_for_function('!isFullscreen()')
            # Swipe also presents the choice; D-Pad enters directly.
            page.locator('button[data-control=swipe]').click()
            page.locator('#startBtn').click()
            page.locator('#fullscreenBtn').click()
            self.assertTrue(page.locator('#orientationDialog').is_visible())
            page.locator('[data-orientation=portrait]').click()
            page.wait_for_function("preferredFullscreenOrientation==='portrait'")
            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_function('!paused && orientationHint.hidden')
            page.evaluate('clearTimeout(timer);goMenu()')
            page.wait_for_function('!isFullscreen()')
            page.locator('button[data-control=dpad]').click()
            page.locator('#startBtn').click()
            page.locator('#fullscreenBtn').click()
            page.wait_for_function('isFullscreen()')
            self.assertFalse(page.locator('#orientationDialog').is_visible())
            self.assertEqual(errors,[])
            browser.close()
