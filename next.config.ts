import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "fveawvyiyqezrrkdwmpw.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  experimental: {
    // Photo uploads go through server actions (default cap 1MB). Photos are shrunk in the
    // browser first; this leaves room for a few at once while staying under Vercel's 4.5MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
