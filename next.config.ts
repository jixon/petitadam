
import type {NextConfig} from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

let nextConfig: NextConfig = {
  /* config options here */
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

if (isGithubActions) {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'petitadam';
  
  nextConfig = {
    ...nextConfig,
    basePath: `/${repoName}`,
    assetPrefix: `/${repoName}/`,
    output: 'export',
  };
}

export default nextConfig;
