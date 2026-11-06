/**
 * Tiny Web Audio synth — no assets. The AudioContext is created lazily on the
 * first user gesture (autoplay policy); `muted` gates all scheduling.
 */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];

export class Sound {
  muted = false;
  private ctx: AudioContext | null = null;

  /** Call from a user-gesture handler so the context is allowed to start. */
  resume(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // no audio available; stay silent
    }
  }

  private tone(freq: number, delay: number, dur: number, type: OscillatorType, gain: number): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Soft blip as each tile joins the trace; pitch climbs the pentatonic scale. */
  tick(step: number): void {
    this.tone(PENTATONIC[Math.min(step, PENTATONIC.length - 1)]!, 0, 0.14, 'triangle', 0.1);
  }

  /** Bright major arpeggio when a word is accepted. */
  success(): void {
    this.tone(523.25, 0, 0.16, 'triangle', 0.12);
    this.tone(659.25, 0.07, 0.16, 'triangle', 0.12);
    this.tone(783.99, 0.14, 0.22, 'triangle', 0.12);
  }

  /** Low double-thud for a rejected word. */
  fail(): void {
    this.tone(150, 0, 0.12, 'square', 0.05);
    this.tone(110, 0.09, 0.16, 'square', 0.05);
  }

  /** Soft rising two-note chirp when a hint is revealed. */
  hint(): void {
    this.tone(783.99, 0, 0.12, 'triangle', 0.09);
    this.tone(1046.5, 0.08, 0.16, 'triangle', 0.09);
  }

  /** Rising resolution chime as the results card appears (ADR-0007). */
  complete(): void {
    this.tone(523.25, 0, 0.2, 'triangle', 0.1);
    this.tone(659.25, 0.1, 0.2, 'triangle', 0.1);
    this.tone(783.99, 0.2, 0.2, 'triangle', 0.1);
    this.tone(1046.5, 0.3, 0.34, 'triangle', 0.12);
  }
}
