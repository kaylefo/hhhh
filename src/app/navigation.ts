import type { AppView } from '../game/types';

export function viewFromPath(pathname: string): AppView {
  if (pathname.startsWith('/gamut')) return 'gamut';
  if (pathname.startsWith('/stats')) return 'stats';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'board';
}

export function pathFromView(view: AppView): string {
  if (view === 'board') return '/';
  return `/${view}`;
}

export function setupNavigation(onViewChange: (view: AppView) => void, onBack: () => void): () => void {
  const handlePopState = () => {
    const view = viewFromPath(window.location.pathname);
    onViewChange(view);
    onBack();
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}
