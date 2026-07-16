import { useEffect, useId, useRef, useState } from 'react';
import styles from './ConfirmDialog.module.css';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireTypedConfirmation?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requireTypedConfirmation,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) {
      setTyped('');
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const typedOk = !requireTypedConfirmation || typed === requireTypedConfirmation;

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={descId} className={styles.message}>
          {message}
        </p>

        {requireTypedConfirmation ? (
          <label className={styles.typedLabel}>
            Type <strong>{requireTypedConfirmation}</strong> to confirm
            <input
              ref={inputRef}
              type="text"
              className={styles.typedInput}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        ) : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={[styles.confirmButton, destructive ? styles.destructive : ''].join(' ')}
            disabled={!typedOk}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
