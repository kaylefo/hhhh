import type { DiscoveryRecord, SourceKind, AxialCoordinate, OKLab, OKLCH } from '../types';
import {
  EXACT_MAX_PAGES,
  EXACT_PAGE_SIZE,
  RGB_BITSET_SIZE,
  RGB_CELL_COUNT,
} from '../constants';
import { rgbCellIndex } from './formatting';
import { oklabToOklch } from './oklab';
import { formatHex } from './srgb';

export class ExactColorBitset {
  private pages = new Map<number, Uint8Array>();
  count = 0;

  has(packed: number): boolean {
    const { pageIndex, byteOffset, bitMask } = this.address(packed);
    const page = this.pages.get(pageIndex);
    if (!page) return false;
    return (page[byteOffset]! & bitMask) !== 0;
  }

  add(packed: number): boolean {
    const { pageIndex, byteOffset, bitMask } = this.address(packed);
    let page = this.pages.get(pageIndex);
    if (!page) {
      page = new Uint8Array(EXACT_PAGE_SIZE);
      this.pages.set(pageIndex, page);
    }
    if (page[byteOffset]! & bitMask) return false;
    page[byteOffset]! |= bitMask;
    this.count++;
    return true;
  }

  remove(packed: number): boolean {
    const { pageIndex, byteOffset, bitMask } = this.address(packed);
    const page = this.pages.get(pageIndex);
    if (!page || !(page[byteOffset]! & bitMask)) return false;
    page[byteOffset]! &= ~bitMask;
    this.count--;
    if (page.every((b) => b === 0)) this.pages.delete(pageIndex);
    return true;
  }

  getPages(): Map<number, Uint8Array> {
    return this.pages;
  }

  loadPages(pages: Map<number, Uint8Array>, count: number): void {
    this.pages = pages;
    this.count = count;
  }

  private address(packed: number): { pageIndex: number; byteOffset: number; bitMask: number } {
    const byteIndex = packed >> 3;
    const bitMask = 1 << (packed & 7);
    const pageIndex = byteIndex >> 12;
    const byteOffset = byteIndex & 4095;
    return { pageIndex, byteOffset, bitMask };
  }

  static pageCount(): number {
    return EXACT_MAX_PAGES;
  }
}

export class RgbCellBitset {
  private data = new Uint8Array(RGB_BITSET_SIZE);
  count = 0;

  has(packed: number): boolean {
    const cell = rgbCellIndex(packed);
    const byteIndex = cell >> 3;
    const bitMask = 1 << (cell & 7);
    return (this.data[byteIndex]! & bitMask) !== 0;
  }

  add(packed: number): boolean {
    const cell = rgbCellIndex(packed);
    const byteIndex = cell >> 3;
    const bitMask = 1 << (cell & 7);
    if (this.data[byteIndex]! & bitMask) return false;
    this.data[byteIndex]! |= bitMask;
    this.count++;
    return true;
  }

  remove(packed: number): boolean {
    const cell = rgbCellIndex(packed);
    const byteIndex = cell >> 3;
    const bitMask = 1 << (cell & 7);
    if (!(this.data[byteIndex]! & bitMask)) return false;
    this.data[byteIndex]! &= ~bitMask;
    this.count--;
    return true;
  }

  getData(): Uint8Array {
    return this.data;
  }

  loadData(data: Uint8Array, count: number): void {
    this.data = data;
    this.count = count;
  }

  static totalCells(): number {
    return RGB_CELL_COUNT;
  }
}

export function createDiscoveryRecord(
  packed: number,
  oklab: OKLab,
  sourceKind: SourceKind,
  coordinate: AxialCoordinate,
  rollIndex: number,
  parentColors: number[],
  parentWeights: number[],
  timestamp: number,
): DiscoveryRecord {
  const oklch: OKLCH = oklabToOklch(oklab);
  return {
    packed,
    hex: formatHex(packed),
    firstSeenAt: timestamp,
    rollIndex,
    sourceKind,
    coordinate,
    parentColors: [...parentColors],
    parentWeights: [...parentWeights],
    oklab,
    oklch,
  };
}

export function dedupePackedColors(colors: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const c of colors) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}
