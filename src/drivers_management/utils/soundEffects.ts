// Web Audio API Sound Effects for Notifications and Alerts
// Provides distinct, pleasant, modern acoustic chimes without requiring external audio files.

class SoundEffectsManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('dtms_sound_enabled');
      this.soundEnabled = stored !== null ? stored === 'true' : true;
    } catch {
      this.soundEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (err) {
      console.warn('AudioContext not available:', err);
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('dtms_sound_enabled', enabled ? 'true' : 'false');
    } catch {}
  }

  public toggleSound(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playChime();
    }
    return next;
  }

  /**
   * Distinctive 3-tone notification chime (F#5 -> A5 -> C#6)
   * Warm marimba-like bell envelope
   */
  public playChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 740, start: 0, duration: 0.22 },     // F#5
        { freq: 880, start: 0.08, duration: 0.26 },  // A5
        { freq: 1108, start: 0.16, duration: 0.45 }, // C#6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // High-end smooth sine with slight triangle harmonic for warmth
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        // Exponential volume decay for bell resonance
        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration);
      });
    } catch (e) {
      console.warn('Failed to play chime:', e);
    }
  }

  /**
   * Success Chime: Upbeat major triad
   */
  public playSuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, start: 0, duration: 0.18 },   // C5
        { freq: 659.25, start: 0.09, duration: 0.2 }, // E5
        { freq: 783.99, start: 0.18, duration: 0.24 }, // G5
        { freq: 1046.5, start: 0.27, duration: 0.5 },  // C6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.16, now + note.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration);
      });
    } catch (e) {
      console.warn('Failed to play success sound:', e);
    }
  }

  /**
   * Alert / Attention Chime: 2-tone warning for deviation or critical issue
   */
  public playAlert() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 880, start: 0, duration: 0.15 },    // A5
        { freq: 659.25, start: 0.12, duration: 0.35 }, // E5
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Richer sound for alert
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.2, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration);
      });
    } catch (e) {
      console.warn('Failed to play alert sound:', e);
    }
  }

  /**
   * Generic dispatcher based on notification / toast type
   */
  public play(type: 'success' | 'error' | 'warning' | 'info' | 'chime' = 'chime') {
    if (type === 'success') {
      this.playSuccess();
    } else if (type === 'error' || type === 'warning') {
      this.playAlert();
    } else {
      this.playChime();
    }
  }
}

export const SoundEffects = new SoundEffectsManager();
