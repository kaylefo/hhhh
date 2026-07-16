import * as random from '../../src/game/random';

export function mockRandomSequence(values: number[]): () => void {
  let index = 0;
  const spy = vi.spyOn(random, 'randomUnit').mockImplementation(() => {
    const value = values[Math.min(index, values.length - 1)]!;
    index++;
    return value;
  });
  return () => spy.mockRestore();
}

export function mockRandomIntSequence(values: number[]): () => void {
  let index = 0;
  const spy = vi.spyOn(random, 'randomInt').mockImplementation((max: number) => {
    const raw = values[Math.min(index, values.length - 1)]!;
    index++;
    return raw % max;
  });
  return () => spy.mockRestore();
}
