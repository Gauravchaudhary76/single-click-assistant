/**
 * Audio and Speech Synthesis Service
 * Handles TTS (SpeechSynthesis API) and Web Audio API synthesized tones
 * 100% offline, zero cloud API dependencies.
 */

class AudioService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private emergencyOscillator: OscillatorNode | null = null;
  private emergencyGain: GainNode | null = null;
  private emergencyInterval: any = null;
  private musicInterval: any = null;
  private musicPlaying = false;

  public speechEnabled = true;
  public speechRate = 1.0;
  public speechVolume = 1.0;
  public audioAlertsEnabled = true;
  public onSpeechSubtitle?: (text: string) => void;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Speak text aloud using SpeechSynthesis
  public speak(text: string, force: boolean = false) {
    if (this.onSpeechSubtitle) {
      this.onSpeechSubtitle(text);
    }

    if (!this.speechEnabled && !force) return;
    if (!this.synth) return;

    try {
      this.synth.cancel(); // Stop any pending speech to prevent queuing lag
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.speechRate;
      utterance.volume = this.speechVolume;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  }

  // Navigation click sound (for menu highlight change)
  public playNavigationTick() {
    if (!this.audioAlertsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // Positive select chime (when an item is selected)
  public playSelectChime() {
    if (!this.audioAlertsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2: A5 (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);
    } catch (e) {}
  }

  // Emergency Pulsating Siren
  public startEmergencySiren() {
    if (!this.audioAlertsEnabled || this.emergencyInterval) return;
    try {
      const ctx = this.getAudioContext();
      let highTone = true;

      const playPulse = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(highTone ? 980 : 750, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        highTone = !highTone;
      };

      playPulse();
      this.emergencyInterval = setInterval(playPulse, 400);
    } catch (e) {}
  }

  public stopEmergencySiren() {
    if (this.emergencyInterval) {
      clearInterval(this.emergencyInterval);
      this.emergencyInterval = null;
    }
  }

  // Simulated Relaxing Music Synthesizer
  public playMusic() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    try {
      const ctx = this.getAudioContext();
      const chords = [
        [261.63, 329.63, 392.00], // C major
        [220.00, 261.63, 329.63], // A minor
        [174.61, 220.00, 261.63], // F major
        [196.00, 246.94, 293.66], // G major
      ];
      let chordIdx = 0;

      const playChord = () => {
        if (!this.musicPlaying) return;
        const currentChord = chords[chordIdx % chords.length];
        chordIdx++;

        currentChord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 2.5);
        });
      };

      playChord();
      this.musicInterval = setInterval(playChord, 2500);
    } catch (e) {}
  }

  public pauseMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public resumeMusic() {
    this.playMusic();
  }

  public stopMusic() {
    this.pauseMusic();
  }

  public isMusicActive(): boolean {
    return this.musicPlaying;
  }
}

export const audio = new AudioService();
