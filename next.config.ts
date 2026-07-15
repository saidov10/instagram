import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  
  images: {
    // AVIF first (smaller), WebP fallback for browsers without AVIF support.
    formats: ["image/avif", "image/webp"],
    // Next.js 16 requires an explicit allowlist of qualities.
    qualities: [50, 75, 90],
    // Cache optimized images for 24h before revalidating with the upstream server.
    minimumCacheTTL: 60 * 60 * 24,
    // Only these hosts may be optimized. Everything else must pass `unoptimized`.
    remotePatterns: [
      // User uploads (avatars, posts, reels, stories, chat files) now live on Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      // Legacy: the backend used to serve uploads from its own /uploads path.
      { protocol: "https", hostname: "instaback-cw0j.onrender.com" },
      // Static demo imagery on the login screen.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
