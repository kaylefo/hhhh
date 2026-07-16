import { useCallback, useEffect, useMemo } from 'react';
import { useGameStore, type BoardRendererBridge } from '../state/gameStore';
import { TopBar } from '../components/TopBar';
import { BottomDock } from '../components/BottomDock';
import { BoardCanvas } from '../renderer/BoardCanvas';
import { GamutView } from '../components/GamutView';
import { StatsView } from '../components/StatsView';
import { SettingsView } from '../components/SettingsView';
import { TileInspector } from '../components/TileInspector';
import { Onboarding } from '../components/Onboarding';
import { ToastRegion } from '../components/ToastRegion';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PendingColorTray } from '../components/PendingColorTray';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { setupNavigation } from './navigation';
import { audioEngine } from '../audio/AudioEngine';
import './app.css';

export function AppShell() {
  const initialized = useGameStore((s) => s.initialized);
  const view = useGameStore((s) => s.view);
  const tiles = useGameStore((s) => s.tiles);
  const frontier = useGameStore((s) => s.frontier);
  const meta = useGameStore((s) => s.meta);
  const settings = useGameStore((s) => s.settings);
  const pendingRoll = useGameStore((s) => s.pendingRoll);
  const selectedTile = useGameStore((s) => s.selectedTile);
  const menuOpen = useGameStore((s) => s.menuOpen);
  const inspectorOpen = useGameStore((s) => s.inspectorOpen);
  const discoveryFeedback = useGameStore((s) => s.discoveryFeedback);
  const undoAvailable = useGameStore((s) => s.undoAvailable);
  const interactionState = useGameStore((s) => s.interactionState);
  const importPreview = useGameStore((s) => s.importPreview);
  const milestoneUnlock = useGameStore((s) => s.milestoneUnlock);

  const placeAt = useGameStore((s) => s.placeAt);
  const selectTile = useGameStore((s) => s.selectTile);
  const setView = useGameStore((s) => s.setView);
  const closeSheet = useGameStore((s) => s.closeSheet);
  const closeMenu = useGameStore((s) => s.closeMenu);
  const persistCameraDebounced = useGameStore((s) => s.persistCameraDebounced);
  const setBoardRenderer = useGameStore((s) => s.setBoardRenderer);
  const undo = useGameStore((s) => s.undo);
  const confirmImport = useGameStore((s) => s.confirmImport);
  const cancelImport = useGameStore((s) => s.cancelImport);
  const dismissMilestone = useGameStore((s) => s.dismissMilestone);

  useKeyboardControls();

  useEffect(() => {
    return setupNavigation(
      (v) => setView(v),
      () => closeSheet(),
    );
  }, [setView, closeSheet]);

  useEffect(() => {
    document.documentElement.style.setProperty('--pending-accent', pendingRoll?.hex ?? '#7AC9E4');
  }, [pendingRoll]);

  useEffect(() => {
    if (settings.sound) {
      audioEngine.setEnabled(true);
    } else {
      audioEngine.setEnabled(false);
    }
  }, [settings.sound]);

  const frontierArray = useMemo(() => frontier.toArray(), [frontier]);

  const handleTileTap = useCallback(
    (q: number, r: number) => {
      selectTile(q, r);
    },
    [selectTile],
  );

  const handleFrontierTap = useCallback(
    (q: number, r: number) => {
      void placeAt(q, r);
      if (settings.sound) audioEngine.playPlacement(pendingRoll?.packedColor ?? 0, 1);
      if (settings.haptics && navigator.vibrate) navigator.vibrate(14);
    },
    [placeAt, settings, pendingRoll],
  );

  const getSettings = useCallback(() => settings, [settings]);

  const onRendererReady = useCallback(
    (bridge: BoardRendererBridge) => {
      setBoardRenderer(bridge);
    },
    [setBoardRenderer],
  );

  if (!initialized || !meta) {
    return <div className="loading-screen">Kulur</div>;
  }

  const sheetOpen = view !== 'board' || menuOpen || inspectorOpen;
  const boardInteraction = view === 'board' && !menuOpen;

  return (
    <div
      className={['app-shell', settings.highContrast ? 'high-contrast' : ''].filter(Boolean).join(' ')}
      style={{ '--pending-accent': pendingRoll?.hex ?? '#7AC9E4' } as React.CSSProperties}
    >
      <TopBar />

      <main className="board-layer" aria-hidden={view !== 'board'}>
        <BoardCanvas
          tiles={tiles}
          frontier={frontierArray}
          camera={meta.camera}
          pendingColor={pendingRoll?.packedColor ?? null}
          selectedTileKey={selectedTile ? `${selectedTile.q},${selectedTile.r}` : null}
          interactionEnabled={boardInteraction}
          onTileTap={handleTileTap}
          onFrontierTap={handleFrontierTap}
          onPanChange={persistCameraDebounced}
          getSettings={getSettings}
          onRendererReady={onRendererReady}
        />
        {discoveryFeedback ? <div className="discovery-float">{discoveryFeedback}</div> : null}
        {undoAvailable ? (
          <div className="undo-bar">
            <button type="button" onClick={() => void undo()}>
              Undo
            </button>
          </div>
        ) : null}
      </main>

      <BottomDock />

      {pendingRoll && interactionState === 'pendingPlacement' ? <PendingColorTray /> : null}

      {sheetOpen ? (
        <>
          <div
            className="sheet-overlay"
            onClick={() => {
              if (view !== 'board') setView('board');
              else closeSheet();
            }}
            aria-hidden="true"
          />
          {view === 'gamut' ? (
            <div className="sheet-panel side" role="dialog" aria-label="Gamut">
              <GamutView />
            </div>
          ) : null}
          {view === 'stats' ? (
            <div className="sheet-panel side" role="dialog" aria-label="Stats">
              <StatsView />
            </div>
          ) : null}
          {view === 'settings' ? (
            <div className="sheet-panel side" role="dialog" aria-label="Settings">
              <SettingsView />
            </div>
          ) : null}
          {menuOpen ? (
            <div className="sheet-panel bottom" role="dialog" aria-label="Menu">
              <nav>
                <ul className="menu-list">
                  {(['board', 'gamut', 'stats', 'settings'] as const).map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        aria-current={view === item ? 'page' : undefined}
                        onClick={() => {
                          setView(item);
                          closeMenu();
                        }}
                      >
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ) : null}
          {inspectorOpen && selectedTile ? (
            <div className="sheet-panel bottom" role="dialog" aria-label="Tile inspector">
              <TileInspector />
            </div>
          ) : null}
        </>
      ) : null}

      <Onboarding />

      {importPreview ? (
        <ConfirmDialog
          open
          title="Import Kulur"
          message={`Replace current board with ${importPreview.tileCount} tiles and ${importPreview.exactColors} exact colors?`}
          confirmLabel="Import"
          onConfirm={() => void confirmImport()}
          onCancel={cancelImport}
        />
      ) : null}

      {milestoneUnlock ? (
        <ConfirmDialog
          open
          title="Unlocked"
          message={`New ${milestoneUnlock.type}: ${milestoneUnlock.id}`}
          confirmLabel="Close"
          cancelLabel="Close"
          onConfirm={dismissMilestone}
          onCancel={dismissMilestone}
        />
      ) : null}

      <ToastRegion />
    </div>
  );
}
