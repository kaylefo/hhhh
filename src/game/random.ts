export function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 0x100000000;
}

export function randomInt(max: number): number {
  return Math.floor(randomUnit() * max);
}

export function randomRange(min: number, max: number): number {
  return min + randomUnit() * (max - min);
}

export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

export function randomChoice<T>(items: readonly T[]): T {
  return items[randomInt(items.length)]!;
}

export function randomUUID(): string {
  return crypto.randomUUID();
}

export function randomExp(): number {
  return -Math.log(Math.max(randomUnit(), 0.000000001));
}
