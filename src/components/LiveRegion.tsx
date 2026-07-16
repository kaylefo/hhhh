import { useGameStore } from '../state/gameStore';

export function LiveRegion() {
  const text = useGameStore((s) => s.liveAnnouncement);
  return (
    <div className="live-region" role="status" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  );
}
