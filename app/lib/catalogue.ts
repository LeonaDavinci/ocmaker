import raw from '../../public/makers/catalogue.json';
import type { CatalogueEntry } from '@/app/types';

/** Small (few kB) index of every mirrored maker — safe to ship in the bundle. */
export const catalogue = raw as CatalogueEntry[];

export const bySlug = (slug: string): CatalogueEntry | undefined =>
  catalogue.find((m) => m.slug === slug);
