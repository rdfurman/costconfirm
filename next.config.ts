import type { NextConfig } from "next";

// Content Security Policy
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
`;

const securityHeaders = [
  // Prevent DNS prefetching
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Enable HSTS (HTTP Strict Transport Security)
  // Force HTTPS for 2 years including subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevent clickjacking by disallowing embedding in iframes
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Enable XSS protection (legacy browsers)
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict feature access (camera, microphone, geolocation)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
  },
];

const nextConfig: NextConfig = {
  output: "standalone", // Enable standalone output for Docker

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Configure server actions
  experimental: {
    serverActions: {
      // Limit request body size to prevent DoS
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
