import env from '@next/env';

const { loadEnvConfig } = env;

loadEnvConfig(process.cwd());

const nextConfig = {
  experimental: {
    serverActions: true
  }
};

export default nextConfig;
