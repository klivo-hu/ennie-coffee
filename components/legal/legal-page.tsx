import { JsonLd } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { OrganicShape } from '@/components/ui/organic-shape';
import type { LegalField } from '@/lib/config/legal';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';

/** Shared frame for the legal documents: a compact title and a readable single column. */
export function LegalPage({
  title,
  path,
  effectiveDate,
  children,
}: {
  title: string;
  path: string;
  effectiveDate: LegalField;
  children: React.ReactNode;
}) {
  return (
    <>
      <section aria-labelledby="legal-title" className="relative overflow-x-clip bg-ivory">
        <OrganicShape
          shape="leaf"
          className="absolute -right-32 -top-24 w-[28rem] max-w-[80vw] rotate-[24deg] text-sage-50"
        />
        <Container width="content" className="relative pb-12 pt-12 md:pb-16 md:pt-20">
          <h1 id="legal-title" className="font-display text-display-lg text-ink">
            {title}
          </h1>
          <p className="mt-4 text-small text-ink-soft">
            Hatályos: {effectiveDate.value ?? <Missing field={effectiveDate} />}
          </p>
        </Container>
      </section>
      <div className="surface-canvas pb-section">
        <Container width="content">
          <div className="legal-prose max-w-[44rem]">{children}</div>
        </Container>
      </div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Főoldal', path: '/' },
          { name: title, path },
        ])}
      />
    </>
  );
}

/** A fact the operator has not configured yet — shown as an explicit gap, never invented. */
export function Missing({ field }: { field: LegalField }) {
  return (
    <span className="rounded-inline bg-warning-soft px-1.5 py-0.5 text-small italic text-warning">
      nincs megadva ({field.key})
    </span>
  );
}

export function FieldValue({ field }: { field: LegalField }) {
  return field.value ? <>{field.value}</> : <Missing field={field} />;
}

/** A labelled fact list, e.g. the operator's registration details. */
export function FactList({ fields }: { fields: readonly LegalField[] }) {
  return (
    <dl className="my-6 divide-y divide-line border-y border-line">
      {fields.map((field) => (
        <div key={field.key} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-6">
          <dt className="text-small text-ink-soft">{field.label}</dt>
          <dd className="text-body text-ink">
            <FieldValue field={field} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
