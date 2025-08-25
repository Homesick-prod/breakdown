/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
    devIndicators: false
  },
  eslint: {
    ignoreDuringBuilds: true,
    devIndicators: false
  },

};

module.exports = nextConfig;