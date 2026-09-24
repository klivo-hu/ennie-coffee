import type { Metadata } from 'next';
import { CategoryManager } from '@/components/admin/category-manager';
import { listCategories } from '@/lib/admin/categories';
import { guardAdminPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: 'Kategóriák' };

export default async function CategoriesPage() {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const categories = await listCategories();
  return <CategoryManager categories={categories} />;
}
