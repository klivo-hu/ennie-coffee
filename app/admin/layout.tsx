import type { Metadata } from 'next';
import { ToastProvider } from '@/components/admin/ui/toast';

export const metadata: Metadata = {
  title: { default: 'Adminisztráció', template: '%s · Ennie Coffee admin' },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/** The admin area: its own quiet frame, no public chrome, never indexed. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-paper">{children}</div>
    </ToastProvider>
  );
}
