// Ultra-Cute Dreamy Candy + Plush Toy Sound Synthesis using Web Audio API

let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;

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

// Helper to create soft white noise
const createNoiseBuffer = () => {
  if (!audioCtx) return null;
  const bufferSize = audioCtx.sampleRate * 2.0; // 2 seconds of noise
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export const playSound = (type: 'click' | 'correct' | 'wrong' | 'ending' | 'swish' | 'ripple' | 'panel') => {
  if (!isSoundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime + 0.03; // Soft delay sync (30ms)
  const pitchVar = getRandomFloat(0.96, 1.04);

  switch (type) {
    case 'click': {
      // Jelly bounce / candy pop ("bloop")
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const startFreq = 600 * pitchVar;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.3, now + 0.15); // Drop frequency fast
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
      
    case 'correct': {
      // Mini xylophone melody + sparkle trimmer
      const playXyloNote = (freq: number, delay: number) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.frequency.value = freq * pitchVar;
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.01); // Sharp attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      };

      // Sparkle shimmer layer
      const playSparkle = (baseDelay: number) => {
        for (let i = 0; i < 5; i++) {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          
          osc.frequency.value = getRandomFloat(2000, 4000);
          
          const sDelay = now + baseDelay + i * 0.04;
          gain.gain.setValueAtTime(0, sDelay);
          gain.gain.linearRampToValueAtTime(0.05, sDelay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, sDelay + 0.1);
          
          osc.start(sDelay);
          osc.stop(sDelay + 0.15);
        }
      };

      playXyloNote(523.25, 0); // C5
      playXyloNote(659.25, 0.1); // E5
      playXyloNote(783.99, 0.2); // G5
      playSparkle(0.2);
      break;
    }
      
    case 'wrong': {
      // Soft descending chime / xylophone / toy tone "doo~"
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const startFreq = 500 * pitchVar;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + 0.35); // Gentle slide down
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Faster soft attack
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4); // Fade out
      
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
      
    case 'ending': {
      // Music box mini melody 🎠
      const playMusicBoxNote = (freq: number, delay: number) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.frequency.value = freq * pitchVar;
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.05); // Soft attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.5); // Slow release
        
        osc.start(now + delay);
        osc.stop(now + delay + 2.0);
      };

      // Fmaj7 Dreamy Arpeggio
      playMusicBoxNote(349.23, 0);       // F4
      playMusicBoxNote(440.00, 0.2);     // A4
      playMusicBoxNote(523.25, 0.4);     // C5
      playMusicBoxNote(659.25, 0.65);    // E5
      playMusicBoxNote(880.00, 1.0);     // A5
      break;
    }
      
    case 'ripple':
    case 'swish': {
      // Soft whoosh + shimmer
      const noiseBuffer = createNoiseBuffer();
      if (!noiseBuffer) return;
      
      const noise = audioCtx.createBufferSource();
      const noiseFilter = audioCtx.createBiquadFilter();
      const noiseGain = audioCtx.createGain();
      
      noise.buffer = noiseBuffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      
      noise.start(now);
      noise.stop(now + 0.5);

      if (type === 'ripple') { // Add extra shimmer for ripples
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 2500;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.4);
      }
      break;
    }

    case 'panel': {
      // Paper flip / soft swish
      const noiseBuffer = createNoiseBuffer();
      if (!noiseBuffer) return;
      
      const noise = audioCtx.createBufferSource();
      const noiseFilter = audioCtx.createBiquadFilter();
      const noiseGain = audioCtx.createGain();
      
      noise.buffer = noiseBuffer;
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800; // Muffled noise
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      noise.start(now);
      noise.stop(now + 0.2);
      break;
    }
  }
};
