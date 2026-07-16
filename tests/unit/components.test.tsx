import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wordmark } from '../../src/components/Wordmark';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';

describe('Wordmark', () => {
  it('renders exactly Kulur', () => {
    render(<Wordmark />);
    expect(screen.getByText('Kulur')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('keeps confirm disabled until typed confirmation matches', () => {
    render(
      <ConfirmDialog
        open
        title="Erase board"
        message="Will permanently remove the board."
        confirmLabel="Erase board"
        requireTypedConfirmation="ERASE KULUR"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Erase board' });
    expect(confirm).toBeDisabled();
  });
});
