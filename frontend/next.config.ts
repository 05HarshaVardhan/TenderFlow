import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '', // no port needed for standard HTTPS URLs
        pathname: '/**', // allow all paths under res.cloudinary.com
      },
      // Keep your existing supabase config if still in use:
      {
        protocol: 'https',
        hostname: 'hyuibbtxqrfhuqgblhzr.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
