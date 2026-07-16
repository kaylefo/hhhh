export { useGameStore } from './gameStore';
export type { GameStore } from './gameStore';

export const selectExactColorCount = (s: { exactColorCount: number }) => s.exactColorCount;
export const selectRgbCellCount = (s: { rgbCellCount: number }) => s.rgbCellCount;
export const selectPendingRoll = (s: { pendingRoll: unknown }) => s.pendingRoll;
export const selectInteractionState = (s: { interactionState: string }) => s.interactionState;
export const selectSettings = (s: { settings: unknown }) => s.settings;
export const selectTiles = (s: { tiles: Map<string, unknown> }) => s.tiles;
export const selectDiscoveries = (s: { discoveries: unknown[] }) => s.discoveries;
