import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MakerStudio from '@/app/components/MakerStudio';
import { bySlug, catalogue } from '@/app/lib/catalogue';
import { absUrl, makerPath, SITE_NAME, SITE_URL } from '@/app/lib/site';

export function generateStaticParams() {
  return catalogue.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = bySlug(slug);
  if (!m) return { title: `Maker not found — ${SITE_NAME}` };

  const title = `${m.name} — ${m.franchise}`;
  const description = `${m.blurb} ${m.parts} part categories, ${m.items} pieces. Free, browser-only character creator.`;
  const og = `/og/${m.slug}.png`;

  return {
    title,
    description,
    keywords: [m.franchise, m.name, 'oc maker', 'character creator', ...m.tags],
    alternates: { canonical: makerPath(slug) },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: absUrl(makerPath(slug)),
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: og,
          width: 1200,
          height: 630,
          alt: `${m.name} preview on ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [og],
    },
  };
}

export default async function MakerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = bySlug(slug);
  if (!entry) notFound();

  const url = absUrl(makerPath(slug));
  const og = absUrl(`/og/${entry.slug}.png`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${url}#app`,
    name: entry.name,
    url,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: {
      '@type': 'Person',
      name: entry.creator,
    },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    description: entry.blurb,
    image: [og, absUrl(entry.icon)],
    screenshot: og,
    featureList: [
      `${entry.parts} part categories`,
      `${entry.items} individual pieces`,
      'Browser-only rendering',
      'Transparent PNG export',
      'Randomize and share links',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MakerStudio entry={entry} siblings={catalogue} />
    </>
  );
}
