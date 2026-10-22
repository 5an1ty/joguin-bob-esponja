"""Poderes legíveis e prática do toque duplo no treino mobile."""
import unittest
from tests import test_game


class PowerMobileReadabilityTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check

    def test_power_hud_is_centered_below_header_with_readable_cards(self):
        for width,height in [(320,568),(390,844),(768,1024),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("startGame();clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
            self.page.wait_for_timeout(60)
            baseline=self.page.locator('#board').bounding_box()
            self.page.evaluate("powers={ghost:gameTime+8000,drill:gameTime+8000,magnet:gameTime+10000};updateStatus()")
            hud=self.page.locator('#powerStatus').bounding_box()
            status=self.page.locator('.status-bar').bounding_box()
            self.assertAlmostEqual(hud['x']+hud['width']/2,width/2,delta=1)
            self.assertGreater(hud['y'],status['y']+status['height'])
            self.assertLess(hud['y']+hud['height'],height-100)
            self.assertEqual(self.page.locator('#powerStatus').evaluate('el=>getComputedStyle(el).opacity'),'1')
            badge=self.page.locator('#powerStatus .effect-badge').first
            self.assertGreaterEqual(badge.bounding_box()['height'],60)
            self.assertGreaterEqual(float(badge.locator('strong').evaluate('el=>parseFloat(getComputedStyle(el).fontSize)')),14)
            self.assertEqual(self.page.locator('#powerStatus').evaluate('el=>getComputedStyle(el).pointerEvents'),'none')
            self.assertEqual(self.page.locator('#board').bounding_box(),baseline)
            self.page.evaluate('powers={};updateStatus()')
            self.assertTrue(self.page.locator('#powerStatus').is_hidden())

    def test_battle_demonstrates_then_practices_double_tap(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.evaluate("goMenu();beginPlayableTutorial();clearTimeout(timer);prepareTutorialLesson(1);clearTimeout(timer)")
        self.assertEqual(self.page.locator('#powerTapCoach').get_attribute('data-state'),'demo')
        self.assertIn('dois toques',self.page.locator('#trainingObjective').inner_text())
        self.page.evaluate('playableTutorial.demoStartedAt-=1000;updateTutorialSlowdown(performance.now());clearTimeout(timer)')
        self.check("assert(abilityReadyAt>gameTime && tutorialSlowdown,'automatic demonstration activates ability');")
        self.page.evaluate('updateTutorialSlowdown(tutorialSlowdown.startedAt+1200);clearTimeout(timer)')
        self.assertEqual(self.page.locator('#powerTapCoach').get_attribute('data-state'),'practice')
        self.assertFalse(self.page.evaluate('paused'))
        self.page.evaluate('togglePause()')
        self.assertTrue(self.page.locator('#powerTapCoach').is_hidden())
        self.page.evaluate('togglePause();clearTimeout(timer)')
        self.assertTrue(self.page.locator('#powerTapCoach').is_visible())
        def tap(pointer):
            self.page.locator('#board').dispatch_event('pointerdown',{'pointerId':pointer,'pointerType':'touch','clientX':170,'clientY':300})
            self.page.locator('#board').dispatch_event('pointerup',{'pointerId':pointer,'pointerType':'touch','clientX':170,'clientY':300})
        tap(31)
        self.assertEqual(self.page.locator('#powerTapCoach').get_attribute('data-state'),'first')
        self.check("assert(abilityReadyAt===0 && !tutorialSlowdown,'single tap does not advance');")
        tap(32)
        self.assertEqual(self.page.locator('#powerTapCoach').get_attribute('data-state'),'complete')
        self.check("assert(abilityReadyAt>gameTime && tutorialSlowdown,'double tap activates and advances');")
        self.page.evaluate('updateTutorialSlowdown(tutorialSlowdown.startedAt+1200);clearTimeout(timer)')
        self.assertEqual(self.page.locator('#powerTapCoach').count(),0)
        self.assertTrue(self.page.evaluate('paused && playableTutorial.explained'))
        self.page.evaluate("goMenu();beginPlayableTutorial();prepareTutorialLesson(1,'practice');clearTimeout(timer);goMenu()")
        self.assertEqual(self.page.locator('#powerTapCoach').count(),0)
