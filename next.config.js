/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './lib'),
      '@app': require('path').resolve(__dirname, './app'),
      '@shared': require('path').resolve(__dirname, './shared'),
    };
    return config;
  },
};

module.exports = nextConfig;
