import {
  ExactColorBitset,
  RgbCellBitset,
  dedupePackedColors,
  createDiscoveryRecord,
} from '../../src/game/color/discovery';
import { packRgb } from '../../src/game/color/srgb';
import { rgbCellIndex } from '../../src/game/color/formatting';
import { EXACT_PAGE_SIZE } from '../../src/game/constants';

describe('ExactColorBitset', () => {
  it('tracks membership across pages', () => {
    const bitset = new ExactColorBitset();
    const pageBoundaryPacked = (EXACT_PAGE_SIZE * 8);
    expect(bitset.add(0)).toBe(true);
    expect(bitset.add(pageBoundaryPacked)).toBe(true);
    expect(bitset.has(0)).toBe(true);
    expect(bitset.has(pageBoundaryPacked)).toBe(true);
    expect(bitset.count).toBe(2);
    expect(bitset.getPages().size).toBeGreaterThanOrEqual(2);
  });

  it('deduplicates adds and supports removal', () => {
    const bitset = new ExactColorBitset();
    const color = packRgb(10, 20, 30);
    expect(bitset.add(color)).toBe(true);
    expect(bitset.add(color)).toBe(false);
    expect(bitset.count).toBe(1);
    expect(bitset.remove(color)).toBe(true);
    expect(bitset.has(color)).toBe(false);
    expect(bitset.count).toBe(0);
  });

  it('loads persisted pages', () => {
    const bitset = new ExactColorBitset();
    bitset.add(packRgb(1, 2, 3));
    const pages = bitset.getPages();
    const restored = new ExactColorBitset();
    restored.loadPages(new Map(pages), bitset.count);
    expect(restored.has(packRgb(1, 2, 3))).toBe(true);
    expect(restored.count).toBe(1);
  });
});

describe('RgbCellBitset', () => {
  it('indexes colors into 5-bit rgb cells', () => {
    const bitset = new RgbCellBitset();
    const red = packRgb(255, 0, 0);
    const cell = rgbCellIndex(red);
    expect(bitset.add(red)).toBe(true);
    expect(bitset.has(red)).toBe(true);
    expect(bitset.add(packRgb(255, 1, 0))).toBe(false);
    expect(bitset.count).toBe(1);
    expect(cell).toBe((31 << 10) | 0);
  });

  it('reports total cell universe size', () => {
    expect(RgbCellBitset.totalCells()).toBe(32768);
  });
});

describe('discovery helpers', () => {
  it('deduplicates packed colors preserving order', () => {
    const a = packRgb(1, 2, 3);
    const b = packRgb(4, 5, 6);
    expect(dedupePackedColors([a, b, a, b, a])).toEqual([a, b]);
  });

  it('creates discovery records with metadata', () => {
    const packed = packRgb(200, 100, 50);
    const record = createDiscoveryRecord(
      packed,
      { L: 0.6, a: 0.1, b: 0.05 },
      'source',
      { q: 0, r: 0 },
      3,
      [packed],
      [1],
      12345,
    );
    expect(record.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(record.rollIndex).toBe(3);
    expect(record.sourceKind).toBe('source');
    expect(record.parentColors).toEqual([packed]);
  });
});
