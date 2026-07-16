import styles from './Wordmark.module.css';

type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={[styles.wordmark, className].filter(Boolean).join(' ')} aria-label="Kulur">
      Kulur
    </span>
  );
}
