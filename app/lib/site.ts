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
 * Static hosts differ on extensionless routes. `.html` is served correctly by
 * every static host (including the CloudStudio preview sandbox). If you deploy
 * behind a host with clean-URL rewrites (Vercel / Netlify / Cloudflare Pages),
 * set this to '' and flip `trailingSlash` in next.config.js.
 *
 * In `next dev` the route is extensionless (`/m/<slug>`), but `output: 'export'`
 * rejects any param not enumerated in `generateStaticParams()` — so a `.html`
 * link (e.g. `/m/character-maker.html`) 500s in dev even though the same file
 * works once statically exported. Mirror `CDN_BASE`: keep `.html` for the
 * production export, drop it in development so internal links match the route.
 */
export const PAGE_EXT = process.env.NODE_ENV === 'production' ? '.html' : '';

/** Site-relative path of a maker studio page. */
export const makerPath = (slug: string): string => `/m/${slug}${PAGE_EXT}`;

/** Absolute https://www.ocmaker.site/... URL for a site-relative path. */
export const absUrl = (path = '/'): string => new URL(path, SITE_URL).toString();
