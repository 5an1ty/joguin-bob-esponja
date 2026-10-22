"""Pausa mobile no topo e reinício somente no menu da partida."""
import unittest
from tests import test_game


class MobilePauseHudTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check
    def test_mobile_pause_hud_only_exposes_menu_actions(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("startGame();clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
        self.page.wait_for_timeout(100)
        for width,height in [(390,844),(844,390),(768,1024)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate('resizeBoardForViewport();clearTimeout(timer)')
            self.page.wait_for_timeout(60)
            pause=self.page.locator('#topPauseBtn').bounding_box()
            leave=self.page.locator('#fullscreenBtn').bounding_box()
            self.assertGreater(pause['x'],width-120)
            self.assertLess(pause['y'],30)
            self.assertLess(pause['x']+pause['width'],leave['x']+1)
            self.assertTrue(self.page.locator('#restartBtn').is_hidden())
            self.assertEqual(self.page.locator('.mobile-dock #topPauseBtn').count(),0)
            self.assertEqual(self.page.locator('#topPauseBtn .pause-icon').count(),1)
        self.page.locator('#topPauseBtn').click()
        self.assertTrue(self.page.locator('#overlayRestartBtn').is_visible())
        self.assertTrue(self.page.locator('#resumeBtn').is_visible())
        self.page.locator('#resumeBtn').click()
        self.check("assert(!paused,'continue works from menu');score=99;endGame();syncMobileControls();")
        self.assertTrue(self.page.locator('#topPauseBtn').is_disabled())
        self.assertNotIn('Jogar novamente',self.page.locator('.mobile-dock').inner_text())
        self.page.locator('#overlayRestartBtn').click()
        self.check("assert(!paused && !over && score===0,'restart only in menu');")
