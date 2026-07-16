import { HEX_RADIUS } from '../constants';
import { worldFromAxial } from './axial';

export const HEX_WORLD_RADIUS = HEX_RADIUS;

export function getHexWorldPosition(q: number, r: number): { x: number; y: number } {
  return worldFromAxial(q, r, HEX_WORLD_RADIUS);
}

export function getHexPixelSize(zoom: number): number {
  return HEX_WORLD_RADIUS * 2 * zoom;
}
