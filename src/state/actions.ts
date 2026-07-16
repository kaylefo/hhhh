import type { GameStore } from './gameStore';

export type GameActions = Pick<
  GameStore,
  | 'roll'
  | 'placeAt'
  | 'undo'
  | 'updateSettings'
  | 'exportData'
  | 'importData'
  | 'eraseBoard'
  | 'setView'
  | 'completeOnboarding'
>;
