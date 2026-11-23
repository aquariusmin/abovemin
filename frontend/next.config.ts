import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// CSP는 사이트가 쓰는 외부 호스트를 모두 나열해야 한다.
// 카카오 우편번호: 스크립트는 t1.kakaocdn.net·t1.daumcdn.net, 검색 화면은 postcode.map.kakao.com iframe.
// api.cloudinary.com은 /admin에서 브라우저가 사진을 직접 업로드하는 곳.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net https://t1.daumcdn.net${isProd ? '' : " 'unsafe-eval'"}`,
  "frame-src 'self' https://postcode.map.kakao.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com",
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
  // OG 이미지가 런타임에 assets/ 서체를 읽는데 트레이서가 못 따라가므로 명시한다.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/**'],
    '/portfolio/opengraph-image': ['./assets/**'],
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // 1년 immutable 캐시: 폰트를 바꿀 때는 덮어쓰지 말고 파일명을 바꾼다.
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/ko/portfolio', destination: '/portfolio', permanent: true },
      { source: '/ko/portfolio/:path*', destination: '/portfolio/:path*', permanent: true },
      { source: '/en', destination: '/en/portfolio', permanent: false },
    ];
  },
  images: {
    // 로더와 remotePatterns는 isRenderableImageUrl과 같은 호스트를 유지해야 한다.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    qualities: [75, 90],
    remotePatterns: [
      new URL('https://res.cloudinary.com/dmljaqqzc/**'),
      new URL('https://images.unsplash.com/**'),
    ],
  },
};

export default nextConfig;
