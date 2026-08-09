import Gallery from '@/app/components/Gallery';
import { catalogue } from '@/app/lib/catalogue';
import { absUrl, makerPath, SITE_NAME, SITE_TAGLINE } from '@/app/lib/site';

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': absUrl('/#website'),
        name: SITE_NAME,
        url: absUrl('/'),
        description: SITE_TAGLINE,
        inLanguage: 'en',
        publisher: { '@type': 'Organization', name: SITE_NAME, url: absUrl('/') },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: absUrl('/?q={search_term_string}'),
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        '@id': absUrl('/#makers'),
        name: 'Character makers',
        itemListElement: catalogue.map((m, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: absUrl(makerPath(m.slug)),
          name: m.name,
          description: m.blurb,
          image: absUrl(m.icon),
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Gallery makers={catalogue} />
    </>
  );
}
