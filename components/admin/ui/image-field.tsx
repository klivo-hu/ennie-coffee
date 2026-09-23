'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';

export interface ImageValue {
  readonly id: string;
  readonly previewUrl: string | null;
}

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif';

/**
 * Upload-and-replace for one image. The file is sent to /api/admin/media, where the server
 * decodes, validates, strips metadata, and renders the web variants; only the resulting media id
 * is kept in the form. The size check here only saves the round trip — the server re-checks.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: ImageValue | null;
  onChange: (next: ImageValue | null) => void;
  hint?: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('A kép legfeljebb 12 MB lehet.');
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set('file', file);
    const result = await api<{ id: string; previewUrl: string | null }>('/api/admin/media', {
      form,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onChange({ id: result.data.id, previewUrl: result.data.previewUrl });
  }

  return (
    <div className="grid gap-2">
      <span id={`${inputId}-label`} className="text-small font-medium text-ink">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-control bg-sage-50">
          {value?.previewUrl ? (
            // Admin preview of an already-processed variant; no optimization pass is needed.
            <img src={value.previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-caption text-ink-soft">
              Nincs kép
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-labelledby={`${inputId}-label`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? 'Feltöltés…' : value ? 'Csere' : 'Kép feltöltése'}
          </Button>
          {value ? (
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => onChange(null)}>
              Eltávolítás
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-caption text-ink-soft">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
