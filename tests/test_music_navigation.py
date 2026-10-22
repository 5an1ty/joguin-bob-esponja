"""Menu/pause soundtrack and uninterrupted draft music."""
import unittest
from tests import test_game


class MusicNavigationTests(unittest.TestCase):
    setUpClass=classmethod(test_game.GameTests.setUpClass.__func__)
    tearDownClass=classmethod(test_game.GameTests.tearDownClass.__func__)
    setUp=test_game.GameTests.setUp
    tearDown=test_game.GameTests.tearDown
    check=test_game.GameTests.check

    def test_menu_pause_and_resume_select_tracks_without_resetting_playhead(self):
        self.page.evaluate('''pararMusica();
          const makeTrack=time=>({paused:true,currentTime:time,muted:false,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}});
          musicas[difficulty]=makeTrack(17);musicTracks.bgm_menu_mode=makeTrack(9);tocarMusica();
        ''')
        self.check("""
          const gameTrack=musicaAtual;
          togglePause();
          assert(paused && selectedMusicKey()==='bgm_menu_mode' && musicaAtual===musicTracks.bgm_menu_mode,'pause uses menu track');
          assert(gameTrack.paused && gameTrack.currentTime>=16.9,'game track held at its current point');
          assert(!musicaAtual.paused,'menu music plays during pause');
        """)
        self.check("""
          const gameTrack=musicas[difficulty],menuTrack=musicaAtual;
          togglePause();clearTimeout(timer);
          assert(!paused && musicaAtual===gameTrack && !gameTrack.paused && gameTrack.currentTime>=16.9,'resume continues gameplay music');
          goMenu();
          assert(currentMusicKey==='bgm_menu_mode' && musicaAtual===menuTrack && !menuTrack.paused && menuTrack.currentTime>=8.9,'menu continues menu soundtrack');
          for(const track of allMusicTracks())if(track!==musicaAtual)assert(track.paused,'no overlapping background tracks');
        """)

    def test_card_selection_never_pauses_or_replaces_gameplay_music(self):
        self.page.evaluate("goMenu();gameMode='bullet';startGame({skipTutorial:true});clearTimeout(timer);stopMovementGuide()")
        self.check("""
          const track=musicaAtual;
          const original=track.pause;let pauses=0,seeks=0;track.pause=function(){pauses++;return original.call(this);};
          const clock=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
          Object.defineProperty(track,'currentTime',{configurable:true,get(){return clock.get.call(this);},set(value){seeks++;clock.set.call(this,value);}});
          try{
            for(const phase of [3,6,9]){
              beginBulletPhase(phase);placeFood();
              assert(paused && bulletState.upgradePending,'draft pauses game');
              assert(currentMusicKey==='bgm_bullet_mode' && musicaAtual===track && !track.paused ,'draft keeps gameplay song playing');
              assert(pauses===0 && seeks===0,'draft never pauses or resets music');
              togglePause();assert(paused,'shortcut cannot skip selection');
              chooseBulletUpgrade(bulletState.offeredUpgrades[0]);clearTimeout(timer);
              assert(musicaAtual===track && !track.paused && pauses===0,'choice resumes without restarting soundtrack');
            }
            togglePause();assert(musicaAtual===musicTracks.bgm_menu_mode && !musicaAtual.paused,'normal pause still changes to menu soundtrack');
          }finally{track.pause=original;delete track.currentTime;}
        """)

    def test_menu_track_respects_audio_preferences_and_decodes(self):
        self.page.evaluate('goMenu();musicMuted=true;applyAudioPreferences();tocarMusica()')
        self.assertTrue(self.page.evaluate("musicaAtual===musicTracks.bgm_menu_mode && musicaAtual.muted && !musicaAtual.paused"))
        self.page.evaluate('musicMuted=false;allMuted=true;applyAudioPreferences()')
        self.assertTrue(self.page.evaluate('musicaAtual.muted'))
        self.page.evaluate('allMuted=false;applyAudioPreferences()')
        self.assertFalse(self.page.evaluate('musicaAtual.muted'))
        self.assertTrue(self.page.evaluate("""async()=>{const response=await fetch(musicSources.bgm_menu_mode);const context=new AudioContext();try{const buffer=await context.decodeAudioData(await response.arrayBuffer());return response.ok && buffer.duration>10;}finally{await context.close();}}"""))

    def test_initial_menu_retries_music_on_first_interaction(self):
        self.page.reload(wait_until='domcontentloaded')
        self.assertEqual(self.page.evaluate('currentMusicKey'),'bgm_menu_mode')
        self.page.locator('[data-character=patrick]').click()
        self.assertTrue(self.page.evaluate("!menu.classList.contains('hidden') && musicaAtual===musicTracks.bgm_menu_mode && !musicaAtual.paused"))
