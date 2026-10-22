"""Poderes legíveis e prática do toque duplo no treino mobile."""
import unittest
from tests import test_game


class PowerMobileReadabilityTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check

    def test_power_hud_stays_in_header_and_leaves_arena_clear(self):
        for width,height in [(320,568),(390,844),(768,1024),(844,390)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.evaluate("startGame();clearTimeout(timer);game.classList.add('fallback-fullscreen');resizeBoardForViewport()")
            self.page.wait_for_timeout(60)
            baseline=self.page.locator('#board').bounding_box()
            self.page.evaluate("powers={ghost:gameTime+8000,drill:gameTime+8000,magnet:gameTime+10000};updateStatus()")
            hud=self.page.locator('#powerStatus').bounding_box()
            header=self.page.locator('.game-head').bounding_box()
            level=self.page.locator('#level').bounding_box()
            pause=self.page.locator('#topPauseBtn').bounding_box()
            self.assertGreaterEqual(hud['x'],level['x']+level['width'])
            self.assertLessEqual(hud['x']+hud['width'],pause['x'])
            self.assertGreaterEqual(hud['y'],header['y'])
            self.assertLessEqual(hud['y']+hud['height'],header['y']+header['height'])
            self.assertEqual(self.page.locator('.board-wrap #powerStatus').count(),0)
            self.assertTrue(self.page.locator('#foodHint').is_hidden())
            self.assertEqual(self.page.locator('#powerStatus .effect-badge').count(),3)
            for badge in self.page.locator('#powerStatus .effect-badge').all():
                self.assertGreaterEqual(badge.bounding_box()['height'],15)
                self.assertEqual(badge.locator('strong').evaluate("el=>getComputedStyle(el,'::after').fontSize"),'12px')
                self.assertEqual(badge.locator('span').get_attribute('data-hud-time')[-1],'s')
            self.assertEqual(self.page.locator('#board').bounding_box(),baseline)
            self.page.evaluate('powers={};updateStatus()')
            self.assertTrue(self.page.locator('#powerStatus').is_hidden())
        self.page.evaluate('leaveFullscreen()')
        self.page.wait_for_timeout(50)
        self.assertEqual(self.page.locator('.board-wrap #powerStatus').count(),1)

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
