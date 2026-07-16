import { useEffect, useState } from 'react';

export function useVisibility(): DocumentVisibilityState {
  const [visibility, setVisibility] = useState<DocumentVisibilityState>(() =>
    typeof document !== 'undefined' ? document.visibilityState : 'visible',
  );

  useEffect(() => {
    const onChange = () => setVisibility(document.visibilityState);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visibility;
}

export function useIsDocumentVisible(): boolean {
  return useVisibility() === 'visible';
}
