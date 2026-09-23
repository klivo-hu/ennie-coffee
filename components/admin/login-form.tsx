'use client';

import { useState } from 'react';
import { Field, FormError, TextInput } from '@/components/admin/ui/field';
import { Button } from '@/components/ui/button';

type Step = 'credentials' | 'mfa';

async function post(path: string, body: unknown) {
  try {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: { next?: string };
      error?: { message: string; fields?: Record<string, string> };
    } | null;
    return { ok: response.ok, payload };
  } catch {
    return {
      ok: false,
      payload: { error: { message: 'Nem sikerült elérni a szervert. Próbáld újra.' } },
    };
  }
}

/**
 * Two-step sign-in. The password step never says which part was wrong; the second step accepts a
 * code from the authenticator app or a single-use recovery code. Password managers and paste work
 * everywhere; the one-time code field hints the browser to offer SMS/OTP autofill.
 */
export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function finish(nextStep: string | undefined) {
    if (nextStep === 'mfa') {
      setStep('mfa');
      setError(null);
      return;
    }
    window.location.assign(nextStep === 'enroll-mfa' ? '/admin/fiok?mfa=1' : next);
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, payload } = await post('/api/auth/login', { username, password });
    setBusy(false);
    if (!ok) {
      setError(payload?.error?.message ?? 'A belépés nem sikerült.');
      return;
    }
    setPassword('');
    finish(payload?.data?.next);
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = useRecovery ? { recoveryCode: code } : { code: code.replace(/\s/g, '') };
    const { ok, payload } = await post('/api/auth/mfa', body);
    setBusy(false);
    if (!ok) {
      const message = payload?.error?.message ?? 'A kód nem megfelelő.';
      if (/lejárt/.test(message)) setStep('credentials');
      setError(message);
      return;
    }
    finish('done');
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={submitCode} className="mt-6 grid gap-5" noValidate>
        <p className="text-body text-ink-soft">
          {useRecovery
            ? 'Add meg az egyik helyreállító kódodat. Minden kód csak egyszer használható.'
            : 'Írd be a hitelesítő alkalmazásban látható 6 jegyű kódot.'}
        </p>
        <FormError message={error} />
        <Field label={useRecovery ? 'Helyreállító kód' : 'Ellenőrző kód'} required>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode={useRecovery ? 'text' : 'numeric'}
              maxLength={useRecovery ? 20 : 7}
              autoFocus
              required
              className="tabular text-lead tracking-[0.2em]"
            />
          )}
        </Field>
        <Button type="submit" disabled={busy || code.trim().length < 6} className="w-full">
          {busy ? 'Ellenőrzés…' : 'Belépés'}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          className="justify-self-start"
          onClick={() => {
            setUseRecovery((value) => !value);
            setCode('');
            setError(null);
          }}
        >
          {useRecovery ? 'Kód az alkalmazásból' : 'Helyreállító kód használata'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} className="mt-6 grid gap-5" noValidate>
      <FormError message={error} />
      <Field label="Felhasználónév" required>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoFocus
          />
        )}
      </Field>
      <Field label="Jelszó" required>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="pr-24"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-1 my-1 rounded-control px-3 text-small text-sage-800 hover:bg-sage-50"
            >
              {showPassword ? 'Elrejtés' : 'Mutasd'}
            </button>
          </div>
        )}
      </Field>
      <Button type="submit" disabled={busy || !username || !password} className="w-full">
        {busy ? 'Belépés…' : 'Belépés'}
      </Button>
    </form>
  );
}
