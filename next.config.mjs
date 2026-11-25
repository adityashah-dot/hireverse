/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  // Reduce unnecessary logging noise in production
  logging: {
    fetches: { fullUrl: false },
  },

  // Compress responses
  compress: true,

  eslint: { ignoreDuringBuilds: true },

  experimental: {
    // Server component fetch caching
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
