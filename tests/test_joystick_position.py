"""Posição configurável do joystick sem alterar a partida."""
import unittest
from tests import test_game


class JoystickPositionTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check

    def test_drag_save_cancel_reset_and_orientation_preferences(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("goMenu();mobileControlMode='joystick';applyControlPreferences();startGame();clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.wait_for_timeout(60)
        self.page.locator('#topPauseBtn').click()
        self.page.evaluate('score=72')
        self.page.locator('#editJoystickBtn').click()
        self.assertTrue(self.page.locator('#joystickEditBar').is_visible())
        self.assertTrue(self.page.evaluate('paused && score===72'))
        def drag_to(x,y):
            box=self.page.locator('#joystick').bounding_box()
            self.page.locator('#joystick').dispatch_event('pointerdown',{'pointerId':41,'pointerType':'touch','clientX':box['x']+64,'clientY':box['y']+64})
            self.page.locator('#joystick').dispatch_event('pointermove',{'pointerId':41,'pointerType':'touch','clientX':x+64,'clientY':y+64})
            self.page.locator('#joystick').dispatch_event('pointerup',{'pointerId':41,'pointerType':'touch','clientX':x+64,'clientY':y+64})
        drag_to(240,450)
        self.assertGreater(self.page.locator('#joystick').bounding_box()['x'],200)
        self.page.locator('[data-joystick-edit=save]').click()
        self.assertTrue(self.page.evaluate("paused && score===72 && joystickPositions.portrait.x>.7"))
        saved=self.page.locator('#joystick').bounding_box()
        self.page.locator('#editJoystickBtn').click();drag_to(20,300)
        self.page.locator('[data-joystick-edit=cancel]').click()
        self.assertAlmostEqual(self.page.locator('#joystick').bounding_box()['x'],saved['x'],delta=1)
        self.page.locator('#resumeBtn').click()
        self.page.evaluate('clearTimeout(timer)')
        box=self.page.locator('#joystick').bounding_box()
        self.page.evaluate('direction={x:1,y:0};nextDirection={...direction};directionQueue=[]')
        self.page.locator('#joystick').dispatch_event('pointerdown',{'pointerId':42,'pointerType':'touch','clientX':box['x']+64,'clientY':box['y']+24})
        self.check("assert(nextDirection.y===-1,'custom joystick still steers');")
        self.page.locator('#joystick').dispatch_event('pointercancel',{'pointerId':42,'pointerType':'touch'})
        self.page.set_viewport_size({'width':844,'height':390})
        self.page.wait_for_timeout(80)
        self.assertLess(self.page.locator('#joystick').bounding_box()['x'],20)
        self.page.locator('#topPauseBtn').click();self.page.locator('#editJoystickBtn').click();drag_to(650,180)
        self.page.locator('[data-joystick-edit=save]').click()
        self.assertTrue(self.page.evaluate('!!joystickPositions.portrait && !!joystickPositions.landscape'))
        self.page.evaluate('goMenu()');self.page.reload(wait_until='domcontentloaded')
        self.assertTrue(self.page.evaluate('!!joystickPositions.portrait && !!joystickPositions.landscape'))
        self.page.evaluate("mobileControlMode='joystick';applyControlPreferences();startGame();clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.wait_for_timeout(80)
        self.assertGreater(self.page.locator('#joystick').bounding_box()['x'],600)
        self.page.locator('#topPauseBtn').click();self.page.locator('#editJoystickBtn').click()
        self.page.locator('[data-joystick-edit=reset]').click();self.page.locator('[data-joystick-edit=save]').click()
        self.assertTrue(self.page.evaluate('!joystickPositions.landscape && !!joystickPositions.portrait'))
        self.assertLess(self.page.locator('#joystick').bounding_box()['x'],20)
