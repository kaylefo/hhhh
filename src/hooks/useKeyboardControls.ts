import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboardControls(enabled = true): void {
  const interactionState = useGameStore((s) => s.interactionState);
  const menuOpen = useGameStore((s) => s.menuOpen);
  const inspectorOpen = useGameStore((s) => s.inspectorOpen);
  const undoAvailable = useGameStore((s) => s.undoAvailable);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const roll = useGameStore((s) => s.roll);
  const undo = useGameStore((s) => s.undo);
  const setView = useGameStore((s) => s.setView);
  const openMenu = useGameStore((s) => s.openMenu);
  const closeSheet = useGameStore((s) => s.closeSheet);
  const copyToClipboard = useGameStore((s) => s.copyToClipboard);
  const centerOrigin = useGameStore((s) => s.centerOrigin);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'z' && !event.shiftKey && undoAvailable) {
          event.preventDefault();
          void undo();
        }
        return;
      }

      const key = event.key;

      if (key === 'Escape') {
        if (menuOpen || inspectorOpen) {
          event.preventDefault();
          closeSheet();
        }
        return;
      }

      if (key === ' ' || key === 'r' || key === 'R') {
        if (interactionState === 'idle') {
          event.preventDefault();
          void roll();
        }
        return;
      }

      if ((key === 'u' || key === 'U') && undoAvailable) {
        event.preventDefault();
        void undo();
        return;
      }

      if (key === '1') {
        event.preventDefault();
        setView('board');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        setView('gamut');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        setView('stats');
        return;
      }
      if (key === '4') {
        event.preventDefault();
        setView('settings');
        return;
      }

      if (key === 'm' || key === 'M') {
        event.preventDefault();
        if (menuOpen) closeSheet();
        else openMenu();
        return;
      }

      if ((key === 'c' || key === 'C') && selectedTile && inspectorOpen) {
        event.preventDefault();
        void copyToClipboard(selectedTile.hex, 'hex');
        return;
      }

      if (key === 'Home') {
        event.preventDefault();
        centerOrigin();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    enabled,
    interactionState,
    menuOpen,
    inspectorOpen,
    undoAvailable,
    selectedTile,
    roll,
    undo,
    setView,
    openMenu,
    closeSheet,
    copyToClipboard,
    centerOrigin,
  ]);
}
