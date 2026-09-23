import type { Metadata } from 'next';
import { ProductManager } from '@/components/admin/product-manager';
import { listCategories } from '@/lib/admin/categories';
import { listProducts } from '@/lib/admin/products';
import { guardAdminPage } from '@/lib/auth/page-guard';
import { connection } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Termékek' };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const params = await searchParams;
  const { db } = connection();
  const [categories, products] = await Promise.all([listCategories(db), listProducts(db, true)]);
  const initialVisibility = typeof params.lathatosag === 'string' ? params.lathatosag : 'osszes';

  return (
    <ProductManager
      categories={categories}
      products={products}
      initialVisibility={initialVisibility}
    />
  );
}
