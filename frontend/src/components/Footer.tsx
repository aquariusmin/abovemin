"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const isLab = pathname === '/lab' || pathname?.startsWith('/lab/');
  const isPortfolioPrint = pathname === '/portfolio/print' || pathname === '/ko/portfolio/print';

  if (isPortfolioPrint) return null;

  const borderColor = isLab ? 'border-white/10' : 'border-black/5';
  const footerBg = isLab ? 'bg-[#1a1c1a]' : 'bg-[#F0EEEA]';
  const footerHeading = isLab ? 'text-accent-light' : 'text-accent';
  const footerSubHeading = isLab ? 'text-white/40' : 'text-black/50';
  const footerBody = isLab ? 'text-white/70' : 'text-black/90';

  return (
    <footer className={`py-10 px-6 md:px-10 border-t ${borderColor} ${footerBg} transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 font-sans">

        <div className="space-y-6 col-span-2 md:col-span-1">
          <h4 className={`font-serif text-xl md:text-2xl font-bold ${footerHeading}`}>phorage</h4>
          <p className={`text-xs md:text-[13px] leading-relaxed font-medium ${footerBody}`}>
            빛을 수집하고 세상을 분석합니다. <br />
            어제와 오늘의 경계에서 발견한 <br />
            가장 정직하고 따뜻한 기록들.
          </p>
        </div>

        <div className="space-y-6">
          <h5 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${footerSubHeading}`}>Index</h5>
          <ul className={`text-[13px] space-y-3 font-semibold ${footerBody}`}>
            <li><Link href="/about" className="hover:text-accent transition-colors">About</Link></li>
            <li><Link href="/portfolio" className="hover:text-accent transition-colors">Portfolio</Link></li>
            <li><Link href="/archive" className="hover:text-accent transition-colors">Archive</Link></li>
            <li><Link href="/shop" className="hover:text-accent transition-colors">Shop</Link></li>
            <li><Link href="/lab" className="hover:text-accent transition-colors italic">The Lab</Link></li>
          </ul>
        </div>

        <div className="space-y-6">
          <h5 className={`text-[10px] uppercase tracking-[0.2em] font-bold ${footerSubHeading}`}>Connect</h5>
          <p className={`text-[13px] font-semibold leading-relaxed ${footerBody}`}>
            <a href="mailto:aquariusmin01@naver.com" className="hover:text-accent transition-colors">
              aquariusmin01@naver.com
            </a>
            <br />
            <a
              href="https://github.com/aquariusmin"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block hover:text-accent transition-colors"
            >
              GitHub / aquariusmin
            </a>
          </p>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto mt-10 pt-10 border-t ${isLab ? 'border-white/5' : 'border-black/5'} flex justify-between items-center text-[10px] uppercase tracking-[0.4em] font-bold ${footerSubHeading}`}>
        <span>&copy; 2026 phorage studio.</span>
        <span className="hover:text-black transition-colors cursor-help">Digital Studio by Sangmin</span>
      </div>
    </footer>
  );
}
