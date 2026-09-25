import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pdi/contracts'],
};

export default nextConfig;
