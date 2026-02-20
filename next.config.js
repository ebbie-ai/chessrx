/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for chess-related WASM (Stockfish)
  // and to allow cross-origin worker if you host stockfish from CDN
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
  webpack: (config) => {
    // Allow WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    return config
  },
}

module.exports = nextConfig
