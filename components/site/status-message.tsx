import { Container } from '@/components/ui/container';
import { OrganicShape } from '@/components/ui/organic-shape';

/**
 * The designed state for "nothing here" and "something went wrong": the site's own type, space,
 * and forms, with a way forward — never a bare browser-style error.
 */
export function StatusMessage({
  code,
  title,
  children,
  actions,
}: {
  code?: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="status-title" className="relative overflow-x-clip bg-ivory">
      <OrganicShape
        shape="drift"
        className="absolute -right-24 top-6 w-[26rem] max-w-[70vw] rotate-[18deg] text-sage-50 md:-right-10 md:w-[34rem]"
      />
      <Container className="relative py-section">
        <div className="max-w-xl">
          {code ? (
            <p className="font-display text-display-md italic text-sage-700" aria-hidden="true">
              {code}
            </p>
          ) : null}
          <h1 id="status-title" className="mt-2 font-display text-display-lg text-ink">
            {title}
          </h1>
          <div className="mt-5 text-lead text-ink-soft">{children}</div>
          {actions ? <div className="mt-9 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </Container>
    </section>
  );
}
