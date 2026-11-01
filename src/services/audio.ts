export interface DrawAudioController {
  start(): void;
  tick(progress: number): void;
  lock(): void;
  stop(): void;
}

type AudioContextConstructor = new () => AudioContext;

class DrawAudio implements DrawAudioController {
  private context: AudioContext | null = null;
  private hum: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) {
      return null;
    }

    if (!this.context) {
      const globalWindow = window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
      };
      const Constructor =
        window.AudioContext ?? globalWindow.webkitAudioContext;

      if (!Constructor) {
        return null;
      }

      try {
        this.context = new Constructor();
      } catch {
        return null;
      }
    }

    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }

    return this.context;
  }

  start() {
    const context = this.ensureContext();
    if (!context || this.hum) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 82;
    gain.gain.value = 0.012;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    this.hum = oscillator;
    this.humGain = gain;
  }

  tick(progress: number) {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "square";
    oscillator.frequency.value = 760 - Math.min(progress, 1) * 260;
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  lock() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    [440, 660].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + index * 0.07 + 0.18,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.19);
    });
  }

  stop() {
    if (this.hum && this.humGain && this.context) {
      const now = this.context.currentTime;
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      this.hum.stop(now + 0.06);
    }

    this.hum = null;
    this.humGain = null;
  }
}

export const drawAudio = new DrawAudio();
