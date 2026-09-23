'use client';

/**
 * Last-resort boundary for a failure in the root layout itself. It replaces the whole document,
 * so it carries its own minimal styling instead of relying on the stylesheet or fonts.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="hu">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#fbf9f4',
          color: '#232822',
          fontFamily: 'Georgia, serif',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 400, margin: 0 }}>Valami nem sikerült.</h1>
          <p style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#5a6157' }}>
            Az oldal most nem töltődött be. Próbáld újra egy pillanat múlva.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1rem',
              height: '3rem',
              padding: '0 1.5rem',
              borderRadius: '0.625rem',
              border: 0,
              background: '#36482f',
              color: '#fbf9f4',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.9375rem',
              cursor: 'pointer',
            }}
          >
            Újrapróbálom
          </button>
        </main>
      </body>
    </html>
  );
}
