import type { BoardState } from './placement';
import type { UndoSnapshot } from '../types';
import { axialKey, getNeighbors } from '../hex/axial';
import { FrontierSet } from '../hex/frontier';

export function applyUndo(state: BoardState, snapshot: UndoSnapshot): void {
  const key = axialKey({ q: snapshot.tile.q, r: snapshot.tile.r });
  state.tiles.delete(key);

  state.frontier = new FrontierSet(snapshot.frontierBefore);

  for (const packed of snapshot.exactBitsAdded) {
    state.exactBitset.remove(packed);
    state.discoveries.delete(packed);
  }
  for (const packed of snapshot.rgbCellsAdded) {
    state.rgbBitset.remove(packed);
  }

  state.recentRing = [...snapshot.recentRingBefore];
  state.reservoir = [...snapshot.reservoirBefore];
  state.hueHistogram = new Int32Array(snapshot.histogramDelta);

  if (snapshot.paletteAnchorAdded !== null) {
    state.expandedAnchors = state.expandedAnchors.filter(
      (a) => a.packed !== snapshot.paletteAnchorAdded,
    );
  }

  state.statistics = { ...snapshot.statsBefore };

  for (const n of getNeighbors({ q: snapshot.tile.q, r: snapshot.tile.r })) {
    const nTile = state.tiles.get(axialKey(n));
    if (nTile) {
      nTile.neighborCount = getNeighbors(n).filter((nn) => state.tiles.has(axialKey(nn))).length;
    }
  }
}
