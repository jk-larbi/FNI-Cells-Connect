// FNI Cells Connect — System-Native Notification Sound & Vibration Utility
// Uses Web Audio API synthesizer for instant in-app feedback without external audio files.

class NotificationAudioService {
  private static audioCtx: AudioContext | null = null;
  private static lastPlayedAt = 0;
  private static userHasInteracted = false;

  private static initInteractionListener() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.userHasInteracted = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        this.initInteractionListener();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.userHasInteracted) {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play an in-app notification chime for foreground events.
   * Debounced to prevent duplicate or rapid overlapping sounds for the same event.
   */
  static playChime(priority: 'general' | 'important' | 'urgent' = 'general'): void {
    if (typeof window === 'undefined') return;

    // Debounce rapid fire (min 1 second between sounds)
    const now = Date.now();
    if (now - this.lastPlayedAt < 1000) return;
    this.lastPlayedAt = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (priority === 'urgent') {
        // Urgent alert chime: 3 high crisp notes (G5 -> C6 -> E6)
        const notes = [783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.12;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.08, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.38);
        });
      } else if (priority === 'important') {
        // Important announcement/report chime: 2 ascending notes (E5 -> B5)
        const notes = [659.25, 987.77];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.14;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.07, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.32);
        });
      } else {
        // Standard message chime: Soft gentle FNI tone (F5 -> A5)
        const notes = [698.46, 880.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.11;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.06, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.28);
        });
      }
    } catch (err) {
      console.warn('[FNI Audio] Could not play notification chime:', err);
    }
  }

  /**
   * Trigger haptic vibration on devices supporting navigator.vibrate
   */
  static triggerVibration(pattern: number[] = [120, 80, 120]): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn('[FNI Vibration] Device vibration error:', err);
      }
    }
  }
}

export const NotificationAudio = NotificationAudioService;
