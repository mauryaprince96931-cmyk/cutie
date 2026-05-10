// Ultra-Cute Dreamy Candy + Plush Toy Sound Synthesis using Web Audio API

let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;

// Anti-spam configuration
const lastPlayed: Record<string, number> = {};
const ANTI_SPAM_DELAY_MS = 80;

// Initialize on first user interaction
export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const setSoundEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
  localStorage.setItem('cute_app_sound', enabled ? '1' : '0');
};

export const loadSoundPreference = () => {
  const pref = localStorage.getItem('cute_app_sound');
  if (pref !== null) {
    isSoundEnabled = pref === '1';
  }
  return isSoundEnabled;
};

const getRandomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// Sound Generators (New "Builder" Sounds)
const generatorsBuilder = {
  softPop: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Soft, cute "pop"
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(1400 * pitchVar, now + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  },
  sparkleChime: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Sparkle "ding"
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(1500 * pitchVar, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  },
  softBoop: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Soft "boop"
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(500 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(300 * pitchVar, now + 0.2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  },
  digitalShimmer: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Soft shimmer
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(2000 * pitchVar, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  },
  bounce: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Playful bounce
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(300 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(500 * pitchVar, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
};

// Original "Viewer" Sounds (simplified reconstruction)
const generatorsViewer = {
  plink: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(1320 * pitchVar, now + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  },
  xyloMelody: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Correct sound
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * pitchVar;
      gain.gain.setValueAtTime(0, now + i*0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i*0.1 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i*0.1);
      osc.stop(now + i*0.1 + 0.5);
    });
  },
  softDescending: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Wrong sound
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(250 * pitchVar, now + 0.35);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  },
  whoosh: (audioCtx: AudioContext, pitchVar: number, now: number) => {
    // Simple whoosh
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }
};

const soundMapBuilder: Record<string, (audioCtx: AudioContext, pitchVar: number, now: number) => void> = {
  click: generatorsBuilder.softPop,
  camo: generatorsBuilder.digitalShimmer,
  correct: generatorsBuilder.sparkleChime,
  wrong: generatorsViewer.softDescending,
  ending: generatorsBuilder.sparkleChime,
  swish: generatorsBuilder.bounce,
  ripple: generatorsBuilder.bounce,
  panel: generatorsBuilder.softPop,
  glitch: generatorsBuilder.digitalShimmer,
  pop: generatorsBuilder.softPop,
  bubble: generatorsBuilder.bounce
};

const soundMapViewer: Record<string, (audioCtx: AudioContext, pitchVar: number, now: number) => void> = {
  click: generatorsViewer.plink,
  camo: generatorsBuilder.digitalShimmer, // Protected
  correct: generatorsViewer.xyloMelody,
  wrong: generatorsViewer.softDescending,
  ending: generatorsViewer.xyloMelody,
  swish: generatorsViewer.whoosh,
  ripple: generatorsViewer.whoosh,
  panel: generatorsViewer.plink,
  glitch: generatorsBuilder.digitalShimmer,
  pop: generatorsBuilder.softPop, // Protected
  bubble: generatorsBuilder.bounce // Protected
};

export const playSound = (type: string, options?: { mode: 'viewer' | 'builder', forceBuilderSound?: boolean }) => {
  if (!isSoundEnabled) return;
  
  const now = Date.now();
  if (lastPlayed[type] && now - lastPlayed[type] < ANTI_SPAM_DELAY_MS) return;
  lastPlayed[type] = now;

  initAudio();
  if (!audioCtx) return;

  const audioTime = audioCtx.currentTime + 0.03;
  const pitchVar = getRandomFloat(0.96, 1.04);
  
  const mode = options?.mode || 'builder';
  const forceBuilder = options?.forceBuilderSound || false;
  
  let generator;
  if(forceBuilder) {
    generator = soundMapBuilder[type];
  } else {
    generator = (mode === 'viewer') ? soundMapViewer[type] : soundMapBuilder[type];
  }
  
  if (generator) {
    generator(audioCtx, pitchVar, audioTime);
  }
};
