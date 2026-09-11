import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Content Security Policy.
// - Supabase, Cloudinary, Unsplash를 이미지/API 소스로 허용
//   (api.cloudinary.com은 /admin에서 브라우저가 사진을 직접 업로드하는 엔드포인트)
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
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://query1.finance.yahoo.com https://query2.finance.yahoo.com",
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
  // `opengraph-image`가 `readFile(process.cwd() + 'assets/…')`로 서체를 읽는다.
  // 파일 트레이서는 그런 런타임 경로를 따라가지 못하므로 명시해 준다 — 없으면
  // 로컬에서는 되고 배포에서만 카드가 폰트 없이(또는 500으로) 나온다.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/**'],
    '/portfolio/opengraph-image': ['./assets/**'],
  },
  serverExternalPackages: ['yahoo-finance2'],
  experimental: {
    // framer-motion re-exports its whole surface from one entry point, so a
    // component that imports `{ motion }` drags the gesture, layout-animation
    // and scroll modules in with it. Next ships this treatment for `recharts`
    // by default; framer-motion is not on that list and is the heavier import
    // of the two here. (`Reveal` no longer uses it at all — see its comment —
    // so this only covers the routes that genuinely animate.)
    optimizePackageImports: ['framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // `public/`는 파일명에 해시가 붙지 않아 기본 캐시가 사실상 없다.
        // 국기 웹폰트는 내용이 고정된 벤더 파일이므로 1년 immutable로 못박는다.
        // 교체할 일이 생기면 덮어쓰지 말고 **파일명을 바꿔야** 한다
        // (public/fonts/README.md 참고).
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Korean is now the default locale at /portfolio; keep the old /ko URLs working.
      { source: '/ko/portfolio', destination: '/portfolio', permanent: true },
      { source: '/ko/portfolio/:path*', destination: '/portfolio/:path*', permanent: true },
      // /en only holds the portfolio for now, so send the bare locale root there.
      // Temporary on purpose: /en may become its own index if more pages get translated.
      { source: '/en', destination: '/en/portfolio', permanent: false },
    ];
  },
  images: {
    // Next 16 ignores any `quality` not listed here and silently falls back to
    // 75. The hero asks for 90, so both values have to be declared.
    qualities: [75, 90],
    remotePatterns: [
      new URL('https://res.cloudinary.com/dmljaqqzc/**'),
      new URL('https://images.unsplash.com/**'),
    ],
  },
};

export default nextConfig;
