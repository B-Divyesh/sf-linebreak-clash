export class GameAudio {
  private context: AudioContext | null = null;

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(kind: 'capture' | 'crash' | 'end'): void {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = kind === 'crash' ? 'square' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'capture' ? 520 : kind === 'crash' ? 130 : 360, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'end' ? 720 : 220, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.19);
  }
}

