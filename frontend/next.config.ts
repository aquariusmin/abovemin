import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Content Security Policy.
// - Supabase, Cloudinary, Unsplash를 이미지/API 소스로 허용
// - Next.js가 필요로 하는 unsafe-inline/eval은 개발에서만, 프로덕션에서도 style unsafe-inline은
//   Tailwind JIT/styled-jsx 때문에 현실적으로 필요
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://query1.finance.yahoo.com https://query2.finance.yahoo.com",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['yahoo-finance2'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      new URL('https://res.cloudinary.com/dmljaqqzc/**'),
      new URL('https://images.unsplash.com/**'),
    ],
  },
};

export default nextConfig;
