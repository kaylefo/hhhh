import { useEffect } from 'react';
import type { ToastMessage } from '../game/types';
import { useGameStore } from '../state/gameStore';
import styles from './ToastRegion.module.css';

const TOAST_DURATION_MS = 3200;

type ToastRegionProps = {
  className?: string;
};

export function ToastRegion({ className }: ToastRegionProps) {
  const toasts = useGameStore((s) => s.toasts);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        useGameStore.setState((state) => ({
          toasts: state.toasts.filter((t) => t.id !== toast.id),
        }));
      }, TOAST_DURATION_MS),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts]);

  return (
    <div
      className={[styles.region, className].filter(Boolean).join(' ')}
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  return (
    <div className={[styles.toast, styles[toast.type]].join(' ')} role="status">
      {toast.text}
    </div>
  );
}
