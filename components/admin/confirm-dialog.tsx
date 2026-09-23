'use client';

import { Button } from '@/components/ui/button';
import { Modal } from './ui/modal';

/** Asks before anything destructive; the destructive action is named on its button. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="text-body text-ink-soft">{message}</div>
      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Mégse
        </Button>
        <Button onClick={onConfirm} disabled={busy} className="bg-danger hover:bg-danger/90">
          {busy ? 'Folyamatban…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
