/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // COOP/COEP headers are required for SharedArrayBuffer, which Stockfish 18
  // (PROXY_TO_PTHREAD / Emscripten) needs for multi-threaded analysis.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
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
