import { generateFoundationAnchors, generateBaseHue, createExpansionAnchor } from '../../src/game/roll/palette';
import { mockRandomSequence } from '../helpers/random';

describe('palette foundation generation', () => {
  it('generates six shuffled foundation anchors from a base hue', () => {
    const restore = mockRandomSequence([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    const baseHue = 120;
    const anchors = generateFoundationAnchors(baseHue);
    restore();

    expect(anchors).toHaveLength(6);
    for (const anchor of anchors) {
      expect(anchor.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(anchor.oklab.L).toBeGreaterThan(0);
      expect(anchor.oklab.L).toBeLessThanOrEqual(1);
      expect(anchor.oklch.C).toBeGreaterThan(0);
    }
  });

  it('offsets hues around the base hue wheel', () => {
    const restore = mockRandomSequence(Array.from({ length: 20 }, (_, i) => i / 20));
    const anchors = generateFoundationAnchors(0);
    restore();
    const hues = anchors.map((a) => a.oklch.h);
    expect(new Set(hues.map((h) => Math.round(h / 60))).size).toBeGreaterThan(1);
  });

  it('creates expansion anchors near requested hue', () => {
    const restore = mockRandomSequence([0.5, 0.5, 0.5, 0.5]);
    const anchor = createExpansionAnchor(200);
    restore();
    expect(anchor.oklch.h).toBeGreaterThan(150);
    expect(anchor.oklch.h).toBeLessThan(250);
    expect(anchor.oklch.C).toBeGreaterThan(0);
  });

  it('generateBaseHue stays within 0-360', () => {
    const restore = mockRandomSequence([0, 0.999]);
    expect(generateBaseHue()).toBeGreaterThanOrEqual(0);
    expect(generateBaseHue()).toBeLessThan(360);
    restore();
  });
});
