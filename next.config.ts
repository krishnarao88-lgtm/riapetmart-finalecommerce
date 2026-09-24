import type { NextConfig } from "next";

const supabase = "https://fveawvyiyqezrrkdwmpw.supabase.co";
// 'unsafe-inline' scripts: the GA4/Meta Pixel init snippets and JSON-LD are inline; nonces would force every page dynamic.
// img-src allows any https host because TikTok cover images come from rotating CDN hosts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${supabase} https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  "frame-src https://js.stripe.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

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
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
