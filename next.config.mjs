/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // Don't fail the production build on lint errors (deploy-critical)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail the production build on type errors during deploy
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
