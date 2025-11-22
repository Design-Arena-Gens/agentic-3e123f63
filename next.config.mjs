/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      rules: {},
    },
  },
  redirects: async () => {
    return [];
  },
};

export default nextConfig;

