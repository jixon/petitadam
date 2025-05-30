
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // basePath: '/petitadam', // Reverted
  // assetPrefix: '/petitadam', // Reverted
  // output: 'export', // Reverted
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    // Required for static export with next/image
    // This can remain true as it doesn't harm SSR/hybrid deployments
    // and is beneficial if you ever do static exports for other purposes.
    unoptimized: true,
  },
};

export default nextConfig;
