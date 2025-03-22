/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14 utilise l'App Router par défaut, donc pas besoin de experimental.appDir
  swcMinify: true,
  poweredByHeader: false,
  // Optimisation de la gestion des chunks
  webpack: (config) => {
    // Optimiser les chunks et leur nommage
    config.optimization.moduleIds = 'deterministic';
    return config;
  },
  // Configuration pour rediriger les requêtes API vers le backend NestJS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  }
};

module.exports = nextConfig;
