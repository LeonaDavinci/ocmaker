import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/app/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/assets/', '/raw-assets/', '/.cache/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
