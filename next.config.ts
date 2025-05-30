
import type {NextConfig} from 'next';

// const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
// const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'petitadam';
// effectiveBasePath will be like "/petitadam" (no trailing slash for env var)
// const effectiveBasePath = isGithubActions ? `/${repoName}` : ''; 

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
    // This can remain true as it doesn't harm SSR/hybrid deployments
    // and is beneficial if you ever do static exports for other purposes.
    unoptimized: true,
  },
  // env: {
  //   NEXT_PUBLIC_BASE_PATH: effectiveBasePath, // Expose it to the client
  // },
};

// if (isGithubActions) {
//   nextConfig.basePath = effectiveBasePath; // e.g., "/petitadam"
//   // assetPrefix for Next.js's own assets (JS, CSS chunks) needs a trailing slash if basePath doesn't cover it fully
//   // However, for GitHub pages, if basePath is /repo, assetPrefix is usually also /repo.
//   // Next.js usually handles its internal paths correctly with basePath.
//   // Let's set assetPrefix to effectiveBasePath for consistency with common GitHub Pages setups.
//   // If basePath is /petitadam, Next.js will request its assets from /petitadam/_next/...
//   nextConfig.assetPrefix = effectiveBasePath; 
//   nextConfig.output = 'export';
// }

export default nextConfig;

