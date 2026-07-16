import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  const initialize = useGameStore((s) => s.initialize);
  const loadError = useGameStore((s) => s.loadError);
  const exportData = useGameStore((s) => s.exportData);
  const eraseBoard = useGameStore((s) => s.eraseBoard);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (loadError) {
    return (
      <div className="error-screen">
        <h1>Kulur</h1>
        <p>{loadError}</p>
        <p>Your local board could not be loaded. You can export remaining data or erase and start fresh.</p>
        <div className="error-actions">
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" onClick={() => void exportData()}>
            Export local data
          </button>
          <button
            type="button"
            onClick={() => {
              void eraseBoard().then(() => window.location.reload());
            }}
          >
            Erase local data
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
