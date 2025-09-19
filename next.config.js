/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure webpack to handle Node.js modules properly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        os: false,
        dns: false,
        dgram: false,
        constants: false,
        stream: false,
        util: false,
        path: false,
        buffer: false,
        events: false,
        'node:events': false,
        url: false,
        querystring: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
