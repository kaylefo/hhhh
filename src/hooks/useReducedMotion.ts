import { useEffect, useState } from 'react';
import { useGameStore } from '../state/gameStore';

function readSystemReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const setting = useGameStore((s) => s.settings.reducedMotion);
  const [systemPref, setSystemPref] = useState(readSystemReducedMotion);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setSystemPref(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (setting === true) return true;
  if (setting === false) return false;
  return systemPref;
}
