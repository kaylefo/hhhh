import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from '../state/gameStore';

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Kulur error:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h1>Kulur</h1>
          <p>{this.state.message || 'Something went wrong.'}</p>
          <div className="error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" onClick={() => void useGameStore.getState().exportData()}>
              Export local data
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Erase all local Kulur data?')) {
                  void useGameStore.getState().eraseBoard();
                  window.location.reload();
                }
              }}
            >
              Erase local data
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
