
export class SoundManager {
  private ctx: AudioContext | null = null;
  private melodyInterval: number | null = null;
  private noteIndex: number = 0;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterVolume: number = 1;
  private musicVolume: number = 0.35;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        // Create master and music buses
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.musicGain.connect(this.masterGain);
        this.masterGain.gain.value = this.masterVolume;
        this.musicGain.gain.value = this.musicVolume;
      }
    }
  }

  public init() {
     if (this.ctx && this.ctx.state === 'suspended') {
         this.ctx.resume().catch(() => {});
     }
     if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
     if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  public setMasterVolume(value: number) {
      this.masterVolume = Math.max(0, Math.min(1, value));
      if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }

  public setMusicVolume(value: number) {
      this.musicVolume = Math.max(0, Math.min(1, value));
      if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  // Helper to play a single note with an envelope
  private playNote(freq: number, type: 'sine' | 'triangle' | 'sawtooth' | 'square', duration: number, volume: number, distortion?: boolean) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      
      // Add distortion for aggressive sound
      if (distortion) {
          const distortionNode = this.ctx.createWaveShaper();
          const curve = new Float32Array(65536);
          for (let i = 0; i < 65536; i++) {
              const x = (i - 32768) / 32768;
              curve[i] = Math.tanh(x * 3) / 3; // Soft clipping
          }
          distortionNode.curve = curve;
          distortionNode.oversample = '4x';
          osc.connect(distortionNode);
          distortionNode.connect(gain);
      } else {
          osc.connect(gain);
      }
      
      gain.connect(this.musicGain || this.ctx.destination);
      
      // ADSR Envelope - faster attack for aggressive sound
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + duration * 0.1); // Fast attack
      gain.gain.exponentialRampToValueAtTime(volume * 0.7, t + duration * 0.3); // Sustain
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // Release
      
      osc.start(t);
      osc.stop(t + duration);
  }

  // Drum sounds
  private playKick(volume: number = 0.2) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t); // Start at 60Hz
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.1); // Drop to 30Hz
      
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      // Sharp attack, quick decay
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      
      osc.start(t);
      osc.stop(t + 0.15);
  }

  private playSnare(volume: number = 0.15) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Snare body (noise-like)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(200, t);
      osc1.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.masterGain || this.ctx.destination);
      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc1.start(t);
      osc1.stop(t + 0.1);
      
      // Snare crack (high frequency)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(800, t);
      osc2.frequency.exponentialRampToValueAtTime(400, t + 0.05);
      osc2.connect(gain2);
      gain2.connect(this.masterGain || this.ctx.destination);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(volume * 0.6, t + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc2.start(t);
      osc2.stop(t + 0.05);
  }

  private playHiHat(volume: number = 0.1) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, t);
      osc.frequency.exponentialRampToValueAtTime(4000, t + 0.05);
      
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      // Very quick attack and decay
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      
      osc.start(t);
      osc.stop(t + 0.05);
  }

  playAmbient(type: 'VILLAGE' | 'DUNGEON') {
      this.init();
      if (!this.ctx) return;
      
      // Stop any existing melody
      this.stopAmbient();

      // Calm, peaceful frequencies - soft and ambient
      // Gentle bass notes (very low volume)
      const bassNotes = [98.00, 110.00, 123.47, 130.81, 146.83]; // G2, A2, B2, C3, D3
      // Soft pad notes (ambient atmosphere)
      const padNotes = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63]; // G3, A3, B3, C4, D4, E4
      // Gentle high notes (sparse)
      const highNotes = [392.00, 440.00, 493.88, 523.25]; // G4, A4, B4, C5

      this.noteIndex = 0;
      let beatCount = 0;

      if (type === 'VILLAGE') {
          // Calm, peaceful village music - very slow and gentle
          this.melodyInterval = window.setInterval(() => {
              beatCount++;
              const beat = beatCount % 16; // Slow cycle
              
              // Very gentle bass - only on main beats, very quiet
              if (beat === 0 || beat === 8) {
                  const bassFreq = bassNotes[this.noteIndex % bassNotes.length];
                  this.playNote(bassFreq, 'sine', 2.0, 0.04, false); // Very soft, long, sine wave
              }
              
              // Soft pad - very quiet, long sustain
              if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
                  const padFreq = padNotes[this.noteIndex % padNotes.length];
                  this.playNote(padFreq, 'sine', 3.0, 0.03, false); // Very soft, very long
              }
              
              // Occasional gentle high note (rare, sparse)
              if (beat === 4 && Math.random() < 0.3) {
                  const highFreq = highNotes[this.noteIndex % highNotes.length];
                  this.playNote(highFreq, 'sine', 1.5, 0.025, false); // Very quiet
              }
              
              // Very occasional subtle movement
              if (beat === 12 && Math.random() < 0.2) {
                  const padFreq = padNotes[(this.noteIndex + 1) % padNotes.length];
                  this.playNote(padFreq, 'sine', 2.5, 0.02, false);
              }

              if (beat === 15) this.noteIndex++;
          }, 800); // Very slow and calm - 800ms = ~37.5 BPM (peaceful)
      } else {
          // Slightly more present but still calm for dungeons
          this.melodyInterval = window.setInterval(() => {
              beatCount++;
              const beat = beatCount % 16;
              
              // Gentle bass - slightly more present
              if (beat === 0 || beat === 8) {
                  const bassFreq = bassNotes[this.noteIndex % bassNotes.length];
                  this.playNote(bassFreq, 'sine', 2.5, 0.05, false); // Still soft but slightly louder
              }
              
              // Soft pad - ambient atmosphere
              if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
                  const padFreq = padNotes[this.noteIndex % padNotes.length];
                  this.playNote(padFreq, 'sine', 3.5, 0.04, false); // Soft and long
              }
              
              // Occasional gentle high note
              if (beat === 4 && Math.random() < 0.4) {
                  const highFreq = highNotes[this.noteIndex % highNotes.length];
                  this.playNote(highFreq, 'sine', 2.0, 0.03, false);
              }
              
              // Subtle harmonic movement
              if (beat === 12 && Math.random() < 0.3) {
                  const padFreq = padNotes[(this.noteIndex + 1) % padNotes.length];
                  this.playNote(padFreq, 'sine', 3.0, 0.025, false);
              }
              
              // Very occasional deep note for atmosphere
              if (beat === 1 && Math.random() < 0.15) {
                  const deepFreq = bassNotes[this.noteIndex % bassNotes.length] * 0.8;
                  this.playNote(deepFreq, 'sine', 2.0, 0.03, false);
              }

              if (beat === 15) this.noteIndex++;
          }, 1000); // Even slower - 1000ms = ~30 BPM (very calm and ambient)
      }
  }

  stopAmbient() {
      if (this.melodyInterval) {
          clearInterval(this.melodyInterval);
          this.melodyInterval = null;
      }
  }

  playAttack(type: 'SWORD' | 'BOW' | 'MAGIC') {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    
    if (type === 'SWORD') {
        // Whoosh noise
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        
        // Impact click
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.masterGain || this.ctx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(100, t);
        osc2.frequency.exponentialRampToValueAtTime(0.01, t + 0.05);
        gain2.gain.setValueAtTime(0.05, t);
        gain2.gain.linearRampToValueAtTime(0, t + 0.05);
        osc2.start(t);
        osc2.stop(t + 0.05);
    } else if (type === 'BOW') {
        // Pew
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
    } else if (type === 'MAGIC') {
        // Zap
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
    }
  }

  playHit(isPlayer: boolean) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);
    
    if (isPlayer) {
        // Low crunch
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    } else {
        // Higher tick
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    }
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playDeath() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
  }

  playAbility(type: 'HEAL' | 'BUFF' | 'EXPLOSION') {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      if (type === 'HEAL') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.3);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.3);
      } else if (type === 'BUFF') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.linearRampToValueAtTime(400, t + 0.2);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.2);
      } else if (type === 'EXPLOSION') {
          // Noise simulation (using low saw for rumbling)
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      }

      osc.start(t);
      osc.stop(t + 0.5);
  }
}

export const soundManager = new SoundManager();
