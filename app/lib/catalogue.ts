import raw from '../../public/makers/catalogue.json';
import type { CatalogueEntry } from '@/app/types';
import { assetUrl } from '@/app/lib/maker';

/** Small (few kB) index of every mirrored maker — safe to ship in the bundle. */
export const catalogue: CatalogueEntry[] = (raw as CatalogueEntry[]).map((m) => ({
  ...m,
  icon: assetUrl(m.icon, m.id),
}));

export const bySlug = (slug: string): CatalogueEntry | undefined =>
  catalogue.find((m) => m.slug === slug);
