import { useRef, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { ConfirmDialog } from './ConfirmDialog';
import { DieStylePicker } from './DieStylePicker';
import { MaterialPicker } from './MaterialPicker';
import { ShareViewSheet } from './ShareViewSheet';
import styles from './SettingsView.module.css';

type SettingsViewProps = {
  className?: string;
};

export function SettingsView({ className }: SettingsViewProps) {
  const settings = useGameStore((s) => s.settings);
  const meta = useGameStore((s) => s.meta);
  const exactColorCount = useGameStore((s) => s.exactColorCount);
  const setView = useGameStore((s) => s.setView);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const exportData = useGameStore((s) => s.exportData);
  const importData = useGameStore((s) => s.importData);
  const eraseBoard = useGameStore((s) => s.eraseBoard);
  const showIntroduction = useGameStore((s) => s.showIntroduction);
  const centerOrigin = useGameStore((s) => s.centerOrigin);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const unlockedMaterials = meta?.unlockedMaterials ?? ['soft'];
  const unlockedDieStyles = meta?.unlockedDieStyles ?? ['cube'];

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await importData(file);
    event.target.value = '';
  };

  return (
    <div className={[styles.view, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => setView('board')} aria-label="Back to board">
          ← Board
        </button>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Experience</h2>
        <ToggleRow label="Sound" checked={settings.sound} onChange={(sound) => void updateSettings({ sound })} />
        <ToggleRow label="Haptics" checked={settings.haptics} onChange={(haptics) => void updateSettings({ haptics })} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <h3 className={styles.subTitle}>Material</h3>
        <MaterialPicker
          value={settings.material}
          unlocked={unlockedMaterials}
          exactColorCount={exactColorCount}
          onChange={(material) => void updateSettings({ material })}
        />
        <h3 className={styles.subTitle}>Die style</h3>
        <DieStylePicker
          value={settings.dieStyle}
          unlocked={unlockedDieStyles}
          exactColorCount={exactColorCount}
          onChange={(dieStyle) => void updateSettings({ dieStyle })}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Accessibility</h2>
        <TriStateRow
          label="Reduced motion"
          value={settings.reducedMotion}
          onChange={(reducedMotion) => void updateSettings({ reducedMotion })}
        />
        <ToggleRow
          label="Color patterns"
          checked={settings.colorPatterns}
          onChange={(colorPatterns) => void updateSettings({ colorPatterns })}
        />
        <ToggleRow
          label="Higher contrast"
          checked={settings.highContrast}
          onChange={(highContrast) => void updateSettings({ highContrast })}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data</h2>
        <div className={styles.actionRow}>
          <button type="button" className={styles.actionButton} onClick={() => void exportData()}>
            Export Kulur
          </button>
          <button type="button" className={styles.actionButton} onClick={handleImportClick}>
            Import Kulur
          </button>
          <button type="button" className={styles.actionButton} onClick={() => setShareOpen(true)}>
            Share current view
          </button>
          <button type="button" className={styles.actionButton} onClick={centerOrigin}>
            Center origin
          </button>
          <button type="button" className={styles.actionButton} onClick={showIntroduction}>
            View introduction
          </button>
          <button type="button" className={styles.destructiveButton} onClick={() => setEraseOpen(true)}>
            Erase board
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".kulur,application/x-kulur"
            className={styles.hiddenInput}
            onChange={(e) => void handleImportFile(e)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <p className={styles.aboutText}>
          Kulur stores exact sRGB colors. Mixing is performed in OKLab because equal numerical changes more closely
          reflect perceived color changes than direct RGB averaging. Shared edges are 50/50 mixes. Completed
          three-tile corners are equal three-color mixes. RGB-map progress uses 32 levels per red, green, and blue
          channel.
        </p>
      </section>

      <ShareViewSheet open={shareOpen} onClose={() => setShareOpen(false)} />

      <ConfirmDialog
        open={eraseOpen}
        title="Erase board?"
        message="This permanently removes all tiles, discoveries, and progress from your device."
        confirmLabel="Erase"
        destructive
        requireTypedConfirmation="ERASE KULUR"
        onCancel={() => setEraseOpen(false)}
        onConfirm={() => {
          setEraseOpen(false);
          void eraseBoard();
        }}
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function TriStateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div className={styles.triRow}>
      <span>{label}</span>
      <div className={styles.triButtons} role="group" aria-label={label}>
        <button
          type="button"
          className={[styles.triButton, value === null ? styles.triActive : ''].join(' ')}
          onClick={() => onChange(null)}
        >
          System
        </button>
        <button
          type="button"
          className={[styles.triButton, value === false ? styles.triActive : ''].join(' ')}
          onClick={() => onChange(false)}
        >
          Off
        </button>
        <button
          type="button"
          className={[styles.triButton, value === true ? styles.triActive : ''].join(' ')}
          onClick={() => onChange(true)}
        >
          On
        </button>
      </div>
    </div>
  );
}
