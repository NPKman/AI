import { config } from 'dotenv';
config({ path: '.env.local' });

const nextConfig = {
  experimental: {
    serverActions: true
  }
};

export default nextConfig;
