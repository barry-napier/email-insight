/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
      },
    ];
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile pictures
  },
  // Enable strict mode for better development experience
  reactStrictMode: true,
  // Improve performance
  swcMinify: true,
  // Enable experimental features for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;