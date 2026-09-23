import { jsonLdScript } from '@/lib/seo/jsonld';

/** Renders one structured-data block. Data blocks are never executed, so no nonce is needed. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  );
}
