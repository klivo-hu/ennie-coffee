'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/admin/client-api';
import { Field, FormError, TextInput } from './ui/field';
import { useToast } from './ui/toast';

export interface AccountSummary {
  readonly username: string;
  readonly roleLabel: string;
  readonly mfaEnabled: boolean;
  readonly mfaRequired: boolean;
  readonly mfaComplete: boolean;
  readonly recoveryCodesRemaining: number;
  readonly lastLoginAt: string | null;
  readonly passwordChangedAt: string;
}

const DATE = new Intl.DateTimeFormat('hu-HU', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Budapest',
});

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const id = title.replace(/\s+/g, '-').toLowerCase();
  return (
    <section aria-labelledby={id} className="rounded-panel bg-white p-6 sm:p-8">
      <h2 id={id} className="font-display text-title text-ink">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const notify = useToast();
  return (
    <div className="grid gap-4">
      <p className="text-body text-ink">
        Mentsd el ezeket a helyreállító kódokat biztonságos helyre (például a jelszókezelődbe). Ha
        elveszíted a telefonodat, ezekkel tudsz belépni. <strong>Most látod őket utoljára.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-control bg-paper p-4 font-mono text-body tabular sm:grid-cols-4">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(codes.join('\n'));
              notify('A kódok a vágólapra kerültek.');
            } catch {
              notify('A másolás nem sikerült — jegyezd fel kézzel a kódokat.', 'error');
            }
          }}
        >
          Kódok másolása
        </Button>
        <Button onClick={onDone}>Elmentettem</Button>
      </div>
    </div>
  );
}

function MfaSetup({ onEnabled }: { onEnabled: (codes: string[]) => void }) {
  const [qr, setQr] = useState<{ qrSvg: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const result = await api<{ qrSvg: string; secret: string }>('/api/admin/account/mfa/setup', {
      body: {},
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setQr(result.data);
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api<{ recoveryCodes: string[] }>('/api/admin/account/mfa/enable', {
      body: { code: code.replace(/\s/g, '') },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.fields?.code ?? result.error.message);
      return;
    }
    onEnabled(result.data.recoveryCodes);
  }

  if (!qr) {
    return (
      <div className="grid gap-4">
        <p className="text-body text-ink-soft">
          Belépéskor a jelszó mellett egy telefonos hitelesítő alkalmazás (pl. Google Authenticator,
          Microsoft Authenticator, 1Password) 6 jegyű kódját is kérjük.
        </p>
        <FormError message={error} />
        <Button onClick={() => void start()} disabled={busy} className="justify-self-start">
          {busy ? 'Előkészítés…' : 'Beállítás indítása'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="grid gap-6 md:grid-cols-[14rem_1fr]" noValidate>
      <div
        className="aspect-square w-56 overflow-hidden rounded-control bg-white p-2 ring-1 ring-line [&_svg]:size-full"
        role="img"
        aria-label="QR-kód a hitelesítő alkalmazáshoz"
        // Generated on the server from our own otpauth URI; contains only SVG paths.
        dangerouslySetInnerHTML={{ __html: qr.qrSvg }}
      />
      <div className="grid content-start gap-4">
        <ol className="list-decimal space-y-1 pl-5 text-body text-ink-soft">
          <li>Olvasd be a QR-kódot a hitelesítő alkalmazással.</li>
          <li>
            Ha nem tudod beolvasni, add meg kézzel ezt a kulcsot:{' '}
            <code className="rounded-inline bg-paper px-1.5 py-0.5 font-mono text-small text-ink">
              {qr.secret}
            </code>
          </li>
          <li>Írd be az alkalmazásban megjelenő 6 jegyű kódot.</li>
        </ol>
        <Field label="Ellenőrző kód" required error={error ?? undefined}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              className="max-w-40 tabular tracking-[0.2em]"
            />
          )}
        </Field>
        <Button
          type="submit"
          disabled={busy || code.replace(/\s/g, '').length !== 6}
          className="justify-self-start"
        >
          {busy ? 'Ellenőrzés…' : 'Bekapcsolás'}
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const notify = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (next !== repeat) {
      setErrors({ repeat: 'A két új jelszó nem egyezik.' });
      return;
    }
    setBusy(true);
    setErrors({});
    const result = await api('/api/admin/account/password', {
      body: { currentPassword: current, newPassword: next },
    });
    setBusy(false);
    if (!result.ok) {
      setErrors(result.error.fields ?? { _: result.error.message });
      return;
    }
    setCurrent('');
    setNext('');
    setRepeat('');
    notify('A jelszó megváltozott. A többi eszközön kijelentkeztettünk.');
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-5" noValidate>
      <FormError message={errors._} />
      <Field label="Jelenlegi jelszó" required error={errors.currentPassword}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        )}
      </Field>
      <Field
        label="Új jelszó"
        required
        hint="Legalább 12 karakter. Egy hosszabb, könnyen megjegyezhető mondat is kiváló."
        error={errors.newPassword}
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        )}
      </Field>
      <Field label="Új jelszó még egyszer" required error={errors.repeat}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
          />
        )}
      </Field>
      <Button type="submit" disabled={busy || !current || !next} className="justify-self-start">
        {busy ? 'Mentés…' : 'Jelszó módosítása'}
      </Button>
    </form>
  );
}

function CodeAction({
  label,
  path,
  withPassword,
  onDone,
}: {
  label: string;
  path: string;
  withPassword?: boolean;
  onDone: (data: { recoveryCodes?: string[] }) => void;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,max-content))] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const body = withPassword
          ? { code: code.replace(/\s/g, ''), password }
          : { code: code.replace(/\s/g, '') };
        const result = await api<{ recoveryCodes?: string[] }>(path, { body });
        setBusy(false);
        if (!result.ok) {
          setError(result.error.fields?.code ?? result.error.message);
          return;
        }
        setCode('');
        setPassword('');
        onDone(result.data);
      }}
    >
      {withPassword ? (
        <Field label="Jelszó" required>
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
      ) : null}
      <Field label="Kód az alkalmazásból" required>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="tabular"
          />
        )}
      </Field>
      <Button
        type="submit"
        variant="secondary"
        disabled={busy || code.replace(/\s/g, '').length !== 6}
      >
        {label}
      </Button>
      {error ? (
        <p role="alert" className="text-caption font-medium text-danger sm:col-span-full">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Own account: password, two-factor sign-in, recovery codes. */
export function AccountPanel({
  account,
  enrollPrompt,
}: {
  account: AccountSummary;
  enrollPrompt: boolean;
}) {
  const notify = useToast();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(account.mfaEnabled);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-display-md text-ink">Fiók és biztonság</h1>
        <p className="mt-2 text-body text-ink-soft">
          {account.username} · {account.roleLabel}
          {account.lastLoginAt
            ? ` · Legutóbbi belépés: ${DATE.format(new Date(account.lastLoginAt))}`
            : ''}
        </p>
      </div>

      {enrollPrompt && !mfaEnabled ? (
        <p role="status" className="rounded-panel bg-warning-soft px-5 py-4 text-small text-ink">
          Ezen a szerveren a kétlépcsős azonosítás kötelező. A beállítás után éred el az
          adminisztráció többi részét.
        </p>
      ) : null}

      <Panel title="Kétlépcsős azonosítás">
        {codes ? (
          <RecoveryCodes
            codes={codes}
            onDone={() => {
              setCodes(null);
              // A fresh page load picks up the upgraded session everywhere (navigation, guards).
              if (enrollPrompt) window.location.assign('/admin');
            }}
          />
        ) : mfaEnabled ? (
          <div className="grid gap-8">
            <p className="text-body text-ink">
              Bekapcsolva. Fel nem használt helyreállító kódok:{' '}
              <strong className="tabular">{account.recoveryCodesRemaining}</strong>.
            </p>
            <div className="grid gap-3">
              <h3 className="text-small font-semibold text-ink">Új helyreállító kódok</h3>
              <p className="text-small text-ink-soft">A régi kódok érvényüket vesztik.</p>
              <CodeAction
                label="Új kódok kérése"
                path="/api/admin/account/mfa/recovery-codes"
                onDone={(data) => data.recoveryCodes && setCodes(data.recoveryCodes)}
              />
            </div>
            {!account.mfaRequired ? (
              <div className="grid gap-3 border-t border-line pt-6">
                <h3 className="text-small font-semibold text-ink">Kikapcsolás</h3>
                <CodeAction
                  label="Kikapcsolás"
                  path="/api/admin/account/mfa/disable"
                  withPassword
                  onDone={() => {
                    setMfaEnabled(false);
                    notify('A kétlépcsős azonosítás kikapcsolva.');
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <MfaSetup
            onEnabled={(recovery) => {
              setMfaEnabled(true);
              setCodes(recovery);
              notify('A kétlépcsős azonosítás bekapcsolva.');
            }}
          />
        )}
      </Panel>

      {account.mfaComplete ? (
        <Panel title="Jelszó módosítása">
          <PasswordForm />
        </Panel>
      ) : null}
    </div>
  );
}
