/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  // Ignored by browsers on plain HTTP, so it is safe for local runs and effective in production.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  // Self-contained server build — required for the deploy Dockerfile.
  output: 'standalone',
  poweredByHeader: false,
  // Native / Node-only modules stay outside the server bundle and are traced into standalone.
  serverExternalPackages: ['@node-rs/argon2', 'sharp', 'postgres'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Candidate widths about 1.2× apart, so the browser's pick is never far above what a slot
    // needs at 1–3× density. Small sizes serve the menu thumbnails, large ones the photo slots.
    deviceSizes: [480, 640, 768, 960, 1152, 1344, 1600, 1920],
    imageSizes: [96, 160, 192, 256, 320, 384],
    // The optimizer only accepts what the site itself requests — the bundled photos at the one
    // quality in use — so it cannot be driven to encode arbitrary variants.
    qualities: [75],
    localPatterns: [{ pathname: '/_next/static/media/**', search: '' }],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
