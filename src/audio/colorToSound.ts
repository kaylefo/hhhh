import { PENTATONIC_SEQUENCE } from '../game/constants';
import { packedToOklab, oklabToOklch } from '../game/color/oklab';

export function colorToMidi(packed: number): number {
  const oklch = oklabToOklch(packedToOklab(packed));
  if (oklch.C < 0.03) return 55;
  const index = Math.floor((oklch.h / 360) * 10) % 10;
  let midi = 48 + PENTATONIC_SEQUENCE[index]!;
  if (oklch.L < 0.35) midi -= 12;
  if (oklch.L > 0.8) midi += 12;
  return midi;
}

export function colorToCutoff(packed: number): number {
  const oklch = oklabToOklch(packedToOklab(packed));
  const normalized = Math.min(1, oklch.C / 0.25);
  return 700 + normalized * (4800 - 700);
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
