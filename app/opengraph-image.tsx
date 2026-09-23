import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Ennie Coffee – kávéház Hatvanban. Nem csak kávé, szeretettel.';

/**
 * The social share card, rendered once at build time in the site's own type and palette: the
 * café's line on the left, the hero cappuccino in an arch on the right.
 */
export default async function OpengraphImage() {
  const root = process.cwd();
  const [display, displayItalic, sans, photo] = await Promise.all([
    readFile(
      path.join(root, 'node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff'),
    ),
    readFile(
      path.join(root, 'node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff'),
    ),
    readFile(
      path.join(
        root,
        'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-500-normal.woff',
      ),
    ),
    readFile(path.join(root, 'assets/images/hero-cappuccino.jpg')),
  ]);
  const photoSrc = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#fbf9f4',
        color: '#232822',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -120,
          top: -140,
          width: 720,
          height: 720,
          borderRadius: '46% 54% 58% 42% / 48% 42% 58% 52%',
          background: '#e8eee3',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 0 0 88px',
          width: 700,
        }}
      >
        <div style={{ display: 'flex', fontFamily: 'Newsreader', fontSize: 40, gap: 12 }}>
          <span>Ennie</span>
          <span style={{ fontStyle: 'italic', color: '#465c41' }}>Coffee</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 56,
            fontFamily: 'Newsreader',
            fontSize: 84,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
          }}
        >
          <span>Nem csak kávé,</span>
          <span style={{ fontStyle: 'italic', color: '#465c41' }}>szeretettel.</span>
        </div>
        <div
          style={{ marginTop: 44, fontFamily: 'Hanken Grotesk', fontSize: 26, color: '#5a6157' }}
        >
          Kávéház Hatvanban, a Kossuth téren
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          paddingRight: 72,
        }}
      >
        <img
          src={photoSrc}
          width={372}
          height={496}
          style={{ objectFit: 'cover', borderRadius: '186px 186px 28px 28px' }}
        />
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Newsreader', data: display, style: 'normal', weight: 400 },
        { name: 'Newsreader', data: displayItalic, style: 'italic', weight: 400 },
        { name: 'Hanken Grotesk', data: sans, style: 'normal', weight: 500 },
      ],
    },
  );
}
