'use client';

import { Link } from '@/components/ui/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export interface AdminNavItem {
  readonly href: string;
  readonly label: string;
}

/** Sidebar navigation on desktop, a scrollable strip on phones. */
export function AdminNav({ items }: { items: readonly AdminNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Adminisztráció">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center whitespace-nowrap rounded-control px-3 text-control transition-colors duration-fast',
                  active
                    ? 'bg-sage-800 text-ivory'
                    : 'text-ink-soft hover:bg-sage-50 hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
