import type { AppView } from '../game/types';

const BASE = import.meta.env.BASE_URL;

function stripBase(pathname: string): string {
  if (BASE === '/') return pathname;
  if (pathname.startsWith(BASE)) {
    const rest = pathname.slice(BASE.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

export function viewFromPath(pathname: string): AppView {
  const path = stripBase(pathname);
  if (path.startsWith('/gamut')) return 'gamut';
  if (path.startsWith('/stats')) return 'stats';
  if (path.startsWith('/settings')) return 'settings';
  return 'board';
}

export function pathFromView(view: AppView): string {
  if (view === 'board') return BASE;
  return `${BASE}${view}`.replace(/\/{2,}/g, '/');
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
