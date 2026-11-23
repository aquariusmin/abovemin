"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hidesSiteChrome } from '@/lib/chrome';
import { CONTACT_EMAIL } from '@/lib/site';

// About and Portfolio are deliberately absent here, as in `Nav`: URL-only by design.
// Notes는 공개된 글이 있을 때만 — `/notes`는 비어 있으면 404다.
function navItems(hasNotes: boolean) {
  return [
    { href: '/archive', label: 'Archive' },
    { href: '/shop', label: 'Shop' },
    ...(hasNotes ? [{ href: '/notes', label: 'Notes' }] : []),
    { href: '/lab', label: 'The Lab', italic: true },
  ];
}

const CONNECT = [
  { href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL, external: false },
  { href: 'https://github.com/aquariusmin', label: 'GitHub / aquariusmin', external: true },
  { href: 'https://instagram.com/sangmin__02', label: 'Instagram / @sangmin__02', external: true },
];

export default function Footer({ hasNotes = false }: { hasNotes?: boolean }) {
  const pathname = usePathname();
  if (hidesSiteChrome(pathname)) return null;

  return (
    <>
    {/* iOS Safari 26 툴바 색용 얇은 띠(`.ios-toolbar-tint`). 푸터의 `isolation`에 갇히지 않게 푸터 밖에 둔다. */}
    <div aria-hidden className="ios-toolbar-tint" />
    <footer data-site-footer className="band-navy texture-grain">
      <div aria-hidden className="h-[2px] bg-gradient-to-r from-forest via-fern to-moss" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 md:px-10 py-10 md:py-12">
        <div className="grid grid-cols-5 md:grid-cols-12 gap-y-8 gap-x-5 sm:gap-x-8 items-start">

          <div className="col-span-5 md:col-span-4 space-y-2.5">
            <p className="eyebrow text-moss">Collecting the winter light</p>
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight leading-none text-cream">
              phorage
            </h2>
            <p className="text-sm leading-relaxed text-cream/70 max-w-xs break-keep">
              사진을 찍고, 그 사진으로 작은 것들을 만듭니다.
            </p>
          </div>

          <div className="hidden md:block md:col-span-1" />

          <nav className="col-span-2 md:col-span-3 space-y-3" aria-label="Footer">
            <h3 className="eyebrow text-cream/50">Index</h3>
            <ul className="space-y-2 text-sm">
              {navItems(hasNotes).map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-cream/80 hover:text-moss transition-colors ${item.italic ? 'italic' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-3 md:col-span-4 space-y-3">
            <h3 className="eyebrow text-cream/50">Connect</h3>
            <ul className="space-y-2 text-sm">
              {CONNECT.map(item => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="link-underline text-cream/80 hover:text-moss"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-9 md:mt-10 pt-5 border-t border-cream/15 flex flex-col sm:flex-row justify-between gap-2 eyebrow text-cream/50">
          <span>&copy; {new Date().getFullYear()} phorage studio</span>
          <span>Photography · Seoul</span>
        </div>
      </div>
    </footer>
    </>
  );
}
