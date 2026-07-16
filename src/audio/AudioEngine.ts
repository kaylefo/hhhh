import { colorToCutoff, colorToMidi, midiToFrequency } from './colorToSound';
import { ROLL_ANIMATION_MS } from '../game/constants';

class AudioEngineImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  private async ensureContext(): Promise<AudioContext | null> {
    if (!this.enabled) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    await this.ensureContext();
  }

  async playRoll(resultPacked: number): Promise<void> {
    const ctx = await this.ensureContext();
    if (!ctx || !this.master) return;

    const resultMidi = colorToMidi(resultPacked);
    const tickCount = 6;
    const tickMs = 28;
    const spacing = ROLL_ANIMATION_MS / tickCount;

    for (let i = 0; i < tickCount; i++) {
      const t = ctx.currentTime + (i * spacing) / 1000;
      const midi = 48 + ((resultMidi - 48) * i) / (tickCount - 1);
      this.scheduleTick(ctx, this.master, t, tickMs / 1000, midiToFrequency(midi));
    }
  }

  async playPlacement(packed: number, neighborCount: number): Promise<void> {
    const ctx = await this.ensureContext();
    if (!ctx || !this.master) return;

    const baseMidi = colorToMidi(packed);
    const intervals = [0, 7, 12, 16];
    const count = Math.min(1 + neighborCount, 4);
    const now = ctx.currentTime;

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = midiToFrequency(baseMidi + intervals[i]!);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = colorToCutoff(packed);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12 / count, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  async playPaletteExpansion(): Promise<void> {
    const ctx = await this.ensureContext();
    if (!ctx || !this.master) return;
    const notes = [60, 64, 67, 72];
    notes.forEach((midi, i) => {
      const t = ctx.currentTime + i * 0.12;
      this.scheduleTick(ctx, this.master!, t, 0.1, midiToFrequency(midi));
    });
  }

  async playUndo(): Promise<void> {
    const ctx = await this.ensureContext();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    [64, 55].forEach((midi, i) => {
      const t = now + i * 0.08;
      this.scheduleTick(ctx, this.master!, t, 0.08, midiToFrequency(midi));
    });
  }

  pause(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (document.visibilityState === 'visible') void this.ctx?.resume();
  }

  private scheduleTick(
    ctx: AudioContext,
    master: GainNode,
    time: number,
    duration: number,
    frequency: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }
}

export const audioEngine = new AudioEngineImpl();

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') audioEngine.pause();
    else audioEngine.resume();
  });
}
