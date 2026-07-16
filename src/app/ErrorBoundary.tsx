import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from '../state/gameStore';

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  message: string;
  eraseText: string;
  showErase: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '', eraseText: '', showErase: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
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
          <p>{this.state.message || 'Something went wrong. Your board data is still on this device.'}</p>
          <div className="error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" onClick={() => void useGameStore.getState().exportData()}>
              Export local data
            </button>
            {!this.state.showErase ? (
              <button type="button" onClick={() => this.setState({ showErase: true })}>
                Erase local data
              </button>
            ) : (
              <div className="error-erase">
                <p>Type ERASE KULUR to permanently remove the board and all discoveries on this device.</p>
                <input
                  aria-label="Type ERASE KULUR to confirm"
                  value={this.state.eraseText}
                  onChange={(e) => this.setState({ eraseText: e.target.value })}
                />
                <button
                  type="button"
                  disabled={this.state.eraseText !== 'ERASE KULUR'}
                  onClick={() => {
                    void useGameStore.getState().eraseBoard();
                    window.location.reload();
                  }}
                >
                  Erase board
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
