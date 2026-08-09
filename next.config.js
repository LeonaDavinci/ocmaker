/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  trailingSlash: false,
};
module.exports = nextConfig;
