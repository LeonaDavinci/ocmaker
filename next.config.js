/** @type {import('next').NextConfig} */
const nextConfig = {
  // `output: 'export'` is only needed for the production static build. In
  // `next dev` it forces every dynamic param to be enumerated in
  // generateStaticParams(), which 500s on the `.html` links the app generates
  // (e.g. /m/character-maker.html). A normal dev server renders dynamic routes
  // on demand, so we drop the export mode outside of production builds.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: { unoptimized: true },
  trailingSlash: false,
};

module.exports = nextConfig;
