import NextLink from 'next/link';
import type { ComponentProps } from 'react';

/**
 * Internal link: next/link with viewport prefetching off.
 *
 * Every route renders per request (the CSP nonce is issued per response), so the automatic
 * prefetch Next fires for each link scrolling into view returns an empty shell the click cannot
 * reuse — one wasted server round-trip per visible link. Navigation itself stays client-side.
 * ESLint points imports of next/link here.
 */
export function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
