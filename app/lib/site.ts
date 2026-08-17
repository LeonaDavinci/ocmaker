/**
 * Single source of truth for the public identity of the site.
 * Change SITE_URL here and canonical tags, Open Graph, sitemap.xml,
 * robots.txt and JSON-LD all follow.
 */

export const SITE_URL = 'https://www.ocmaker.site';
export const SITE_DOMAIN = 'www.ocmaker.site';
export const SITE_NAME = 'OC Maker';
export const SITE_TAGLINE = 'Free character creators for 12 games, anime & IPs';
export const SITE_DESCRIPTION =
  'Build an original character for Dandy\u2019s World, Sonic, My Little Pony, Warrior Cats, FNAF, Genshin, Hazbin Hotel, Murder Drones, Gorilla Tag and more. Swap hair, eyes, brows, muzzles, horns and outfits, recolour every layer, then download a transparent PNG. 100% free and fully in-browser.';

/**
 * Clean URLs. The site is served by a host that supports extensionless routes
 * (Vercel / Netlify / Cloudflare Pages), so `PAGE_EXT` is empty and
 * `trailingSlash: true` is set in next.config.js. The static export then emits
 * `/m/<slug>/index.html`, served at the clean `/m/<slug>/` URL — which also
 * matches the `next dev` route, so internal links never 404/500.
 *
 * For a static host that cannot do clean URLs, set `PAGE_EXT = '.html'` and
 * flip `trailingSlash` back to false.
 */
export const PAGE_EXT = '';

/** Site-relative path of a maker studio page. Clean URLs end with a slash. */
export const makerPath = (slug: string): string =>
  PAGE_EXT ? `/m/${slug}${PAGE_EXT}` : `/m/${slug}/`;

/** Absolute https://www.ocmaker.site/... URL for a site-relative path. */
export const absUrl = (path = '/'): string => new URL(path, SITE_URL).toString();
