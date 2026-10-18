// Authentic "Who Wants to Be a Millionaire" Soundtrack & Sound Effects Manager
// Uses the real broadcast MP3 audio files stored in /sounds/ with mobile Safari/Chrome gesture unlock

type SoundKey =
  | 'main_theme'
  | 'lets_play'
  | 'stage1_music'
  | 'stage2_music'
  | 'stage3_64k'
  | 'stage3_250k'
  | 'stage3_500k'
  | 'stage3_1m'
  | 'final_answer'
  | 'correct_answer'
  | 'wrong_answer'
  | 'fifty_fifty'
  | 'phone_friend'
  | 'ask_audience';

const SOUND_PATHS: Record<SoundKey, string> = {
  main_theme: '/sounds/main_theme.mp3',
  lets_play: '/sounds/lets_play.mp3',
  stage1_music: '/sounds/stage1_music.mp3',
  stage2_music: '/sounds/stage2_music.mp3',
  stage3_64k: '/sounds/stage3_64k.mp3',
  stage3_250k: '/sounds/stage3_250k.mp3',
  stage3_500k: '/sounds/stage3_500k.mp3',
  stage3_1m: '/sounds/stage3_1m.mp3',
  final_answer: '/sounds/final_answer.mp3',
  correct_answer: '/sounds/correct_answer.mp3',
  wrong_answer: '/sounds/wrong_answer.mp3',
  fifty_fifty: '/sounds/fifty_fifty.mp3',
  phone_friend: '/sounds/phone_friend.mp3',
  ask_audience: '/sounds/ask_audience.mp3',
};

class SoundManager {
  public isMuted: boolean = false;
  public isWelcomeMusicPlaying: boolean = false;
  private audioCache: Partial<Record<SoundKey, HTMLAudioElement>> = {};
  private currentBgAudio: HTMLAudioElement | null = null;
  private currentStingAudio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private pendingUnlockCleanup: (() => void) | null = null;
  private listeners: Set<(playing: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      (Object.keys(SOUND_PATHS) as SoundKey[]).forEach((key) => {
        const audio = new Audio(SOUND_PATHS[key]);
        audio.preload = 'auto';
        this.audioCache[key] = audio;
      });
    }
  }

  public subscribeWelcomeMusicState(cb: (playing: boolean) => void) {
    this.listeners.add(cb);
    cb(this.isWelcomeMusicPlaying);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyWelcomeState(playing: boolean) {
    this.isWelcomeMusicPlaying = playing;
    this.listeners.forEach((cb) => cb(playing));
  }

  private getAudio(key: SoundKey): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCache[key]) {
      const audio = new Audio(SOUND_PATHS[key]);
      audio.preload = 'auto';
      this.audioCache[key] = audio;
    }
    return this.audioCache[key] || null;
  }

  private clearPendingUnlock() {
    if (this.pendingUnlockCleanup) {
      this.pendingUnlockCleanup();
      this.pendingUnlockCleanup = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentBgAudio) {
      this.currentBgAudio.muted = muted;
    }
    if (this.currentStingAudio) {
      this.currentStingAudio.muted = muted;
    }
  }

  public stopAll() {
    this.clearPendingUnlock();
    this.stopBackgroundMusic();
    if (this.currentStingAudio) {
      this.currentStingAudio.pause();
      this.currentStingAudio.currentTime = 0;
      this.currentStingAudio = null;
    }
  }

  public stopBackgroundMusic() {
    if (this.currentBgAudio) {
      this.currentBgAudio.pause();
      this.currentBgAudio.currentTime = 0;
      this.currentBgAudio = null;
    }
    this.notifyWelcomeState(false);
  }

  private playSting(key: SoundKey, volume = 0.85) {
    if (this.isMuted) return;
    const audio = this.getAudio(key);
    if (!audio) return;

    if (this.currentStingAudio && this.currentStingAudio !== audio) {
      this.currentStingAudio.pause();
      this.currentStingAudio.currentTime = 0;
    }

    audio.currentTime = 0;
    audio.volume = volume;
    audio.muted = this.isMuted;
    this.currentStingAudio = audio;
    audio.play().catch(() => {});
  }

  // Plays the opening Main Theme automatically when the game opens, or unlocks on first mobile/desktop gesture
  public playMainTheme() {
    this.stopAll();
    if (this.isMuted) return;
    const bg = this.getAudio('main_theme');
    if (!bg) return;

    bg.loop = true;
    bg.volume = 0.8;
    bg.currentTime = 0;
    bg.muted = this.isMuted;
    this.currentBgAudio = bg;

    const tryPlay = () => {
      if (this.currentBgAudio !== bg || this.isMuted) return;
      const playPromise = bg.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.notifyWelcomeState(true);
            this.clearPendingUnlock();
          })
          .catch(() => {
            this.notifyWelcomeState(false);
          });
      }
    };

    tryPlay();

    // Register universal touch/click/key unlock listeners for mobile and desktop browsers
    const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
    const unlockHandler = () => {
      if (this.currentBgAudio === bg && !this.isMuted && bg.paused) {
        bg.play()
          .then(() => {
            this.notifyWelcomeState(true);
            this.clearPendingUnlock();
          })
          .catch(() => {});
      }
    };

    events.forEach((evt) => {
      document.addEventListener(evt, unlockHandler, { capture: true, passive: true });
    });

    this.pendingUnlockCleanup = () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, unlockHandler, { capture: true });
      });
    };
  }

  // Starts the real Millionaire looping question background music according to question level (0..14)
  public startQuestionMusic(questionIndex: number) {
    this.clearPendingUnlock();
    this.stopBackgroundMusic();
    if (this.isMuted) return;

    let trackKey: SoundKey = 'stage1_music';
    if (questionIndex <= 4) {
      trackKey = 'stage1_music';
    } else if (questionIndex <= 9) {
      trackKey = 'stage2_music';
    } else if (questionIndex === 10) {
      trackKey = 'stage3_64k';
    } else if (questionIndex <= 12) {
      trackKey = 'stage3_250k';
    } else if (questionIndex === 13) {
      trackKey = 'stage3_500k';
    } else {
      trackKey = 'stage3_1m';
    }

    const bg = this.getAudio(trackKey);
    if (!bg) return;

    bg.loop = true;
    bg.volume = 0.65;
    bg.currentTime = 0;
    bg.muted = this.isMuted;
    this.currentBgAudio = bg;
    bg.play().catch(() => {});
  }

  public playLetsPlay() {
    this.clearPendingUnlock();
    this.playSting('lets_play', 0.85);
  }

  public playOptionAppear(index: number) {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

      const now = this.ctx.currentTime;
      const notes = [392.0, 440.0, 493.88, 523.25];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[index % 4], now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  public playLockAnswer() {
    this.clearPendingUnlock();
    this.stopBackgroundMusic();
    this.playSting('final_answer', 0.9);
  }

  public playCorrect() {
    this.clearPendingUnlock();
    this.stopBackgroundMusic();
    this.playSting('correct_answer', 0.9);
  }

  public playWrong() {
    this.clearPendingUnlock();
    this.stopBackgroundMusic();
    this.playSting('wrong_answer', 0.9);
  }

  public playFiftyFifty() {
    this.playSting('fifty_fifty', 0.95);
  }

  public playPhoneFriend() {
    this.playSting('phone_friend', 0.85);
  }

  public playAskAudience() {
    this.playSting('ask_audience', 0.85);
  }

  public playMillionVictory() {
    this.stopAll();
    this.playMainTheme();
  }
}

export const soundFX = new SoundManager();
