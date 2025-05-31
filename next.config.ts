
import type {NextConfig} from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'petitadam';
// effectiveBasePath will be like "/petitadam" (no trailing slash for env var)
const effectiveBasePath = isGithubActions ? `/${repoName}` : ''; 

let nextConfig: NextConfig = {
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
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: effectiveBasePath, // Expose it to the client
  },
  // Ensure trailing slashes for all routes. This helps with static export
  // compatibility on platforms like GitHub Pages, by generating /path/to/page/index.html
  // instead of /path/to/page.html.
  trailingSlash: true,
};

if (isGithubActions) {
  nextConfig.basePath = effectiveBasePath; // e.g., "/petitadam"
  // assetPrefix for Next.js's own assets (JS, CSS chunks)
  nextConfig.assetPrefix = effectiveBasePath; 
  nextConfig.output = 'export';
}

export default nextConfig;
