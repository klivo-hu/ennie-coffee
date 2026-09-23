import type { Config } from 'tailwindcss';

/**
 * Tailwind reads every value from the custom properties in app/globals.css, so the stylesheet
 * stays the single source of truth. Colors go through their channel token so opacity modifiers
 * (`bg-sage-800/90`, `border-ink/15`) compile.
 */
const channel = (token: string) => `rgb(var(--cef-${token}-rgb) / <alpha-value>)`;

const sage = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [step, channel(`sage-${step}`)]),
);

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Semantic radii only (see --cef-radius-* in globals.css). The default scale is replaced, not
    // extended, so an ad-hoc rounded-md cannot creep back in.
    borderRadius: {
      none: '0',
      inline: 'var(--cef-radius-inline)',
      control: 'var(--cef-radius-control)',
      panel: 'var(--cef-radius-panel)',
      media: 'var(--cef-radius-media)',
      full: '9999px',
    },
    extend: {
      colors: {
        ivory: channel('ivory'),
        paper: channel('paper'),
        ink: {
          DEFAULT: channel('ink'),
          soft: channel('ink-soft'),
          sage: channel('ink-sage'),
        },
        line: {
          DEFAULT: channel('line'),
          strong: channel('line-strong'),
        },
        sage,
        background: channel('background'),
        surface: channel('surface'),
        foreground: channel('foreground'),
        muted: channel('muted'),
        border: channel('border'),
        primary: {
          DEFAULT: channel('primary'),
          foreground: channel('primary-foreground'),
        },
        accent: channel('accent'),
        focus: channel('focus'),
        danger: {
          DEFAULT: channel('danger'),
          soft: channel('danger-soft'),
        },
        success: channel('success'),
        warning: {
          DEFAULT: channel('warning'),
          soft: channel('warning-soft'),
        },
      },
      fontFamily: {
        display: ['var(--cef-font-display)'],
        sans: ['var(--cef-font-sans)'],
      },
      fontSize: {
        'display-xl': [
          'var(--cef-text-display-xl)',
          {
            lineHeight: 'var(--cef-leading-display)',
            letterSpacing: 'var(--cef-tracking-display)',
          },
        ],
        'display-lg': [
          'var(--cef-text-display-lg)',
          {
            lineHeight: 'var(--cef-leading-heading)',
            letterSpacing: 'var(--cef-tracking-display)',
          },
        ],
        'display-md': [
          'var(--cef-text-display-md)',
          {
            lineHeight: 'var(--cef-leading-heading)',
            letterSpacing: 'var(--cef-tracking-heading)',
          },
        ],
        title: ['var(--cef-text-title)', { lineHeight: 'var(--cef-leading-title)' }],
        lead: ['var(--cef-text-lead)', { lineHeight: '1.6' }],
        body: ['var(--cef-text-body)', { lineHeight: 'var(--cef-leading-body)' }],
        control: ['var(--cef-text-control)', { lineHeight: '1.25' }],
        small: ['var(--cef-text-small)', { lineHeight: '1.55' }],
        caption: ['var(--cef-text-caption)', { lineHeight: '1.5' }],
      },
      letterSpacing: {
        label: 'var(--cef-tracking-label)',
      },
      spacing: {
        section: 'var(--cef-space-section)',
        'section-tight': 'var(--cef-space-section-tight)',
        gutter: 'var(--cef-space-gutter)',
        stack: 'var(--cef-space-stack)',
      },
      maxWidth: {
        wide: 'var(--cef-container-wide)',
        content: 'var(--cef-container-content)',
        text: 'var(--cef-container-text)',
      },
      boxShadow: {
        soft: 'var(--cef-shadow-soft)',
        lift: 'var(--cef-shadow-lift)',
      },
      transitionDuration: {
        fast: 'var(--cef-duration-fast)',
        DEFAULT: 'var(--cef-duration-base)',
        base: 'var(--cef-duration-base)',
        slow: 'var(--cef-duration-slow)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--cef-ease-standard)',
        standard: 'var(--cef-ease-standard)',
        out: 'var(--cef-ease-out)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--cef-duration-slow) var(--cef-ease-out) both',
      },
    },
  },
  plugins: [],
};

export default config;
