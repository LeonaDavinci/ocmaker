import type { MetadataRoute } from 'next';
import { catalogue } from '@/app/lib/catalogue';
import { absUrl, makerPath, SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap[number] = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  };

  const makers: MetadataRoute.Sitemap = catalogue.map((m) => ({
    url: absUrl(makerPath(m.slug)),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [home, ...makers];
}
