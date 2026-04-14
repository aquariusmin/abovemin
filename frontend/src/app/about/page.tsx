import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'phorage studio — 빛을 수집하고 세상을 분석하는 디지털 스튜디오.',
};

export default function About() {
  return (
    <main className="min-h-screen bg-surface text-[#333] px-4 sm:px-6 md:px-10 py-10 md:py-16 font-serif">
      <div className="max-w-3xl mx-auto space-y-12 md:space-y-20">

        {/* Hero */}
        <header className="space-y-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-sans">About</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            빛을 수집하고,<br />
            세상을 <span className="text-accent">분석</span>합니다.
          </h2>
          <div className="w-16 h-1 bg-accent" />
        </header>

        {/* Story */}
        <section className="space-y-6 font-sans text-sm md:text-[15px] text-gray-600 leading-relaxed">
          <p>
            <strong className="text-[#222] font-serif text-lg">phorage</strong>는 photography와 forage의 합성어입니다.
            무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록 — 일상 속에서 발견한 빛을 채집하고 기록합니다.
          </p>
          <p>
            사진 아카이브와 소품샵을 운영하며, 퀀트와 데이터에 관심이 많아
            글로벌 시장을 관찰하고 분석하는 <span className="italic">Lab</span>을 함께 만들어가고 있습니다.
          </p>
        </section>

        {/* What I do */}
        <section className="space-y-8">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-sans">What I Do</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                title: 'Archive',
                desc: '필름과 디지털로 담은 사진들을 앨범 단위로 정리합니다.',
                href: '/archive',
              },
              {
                title: 'Shop',
                desc: '자연에서 영감 받은 포스터, 문구, 라이프스타일 소품을 소개합니다.',
                href: '/shop',
              },
              {
                title: 'Lab',
                desc: '글로벌 주식, 크립토, 원자재, 채권 시장을 실시간으로 관찰합니다.',
                href: '/lab',
              },
            ].map(item => (
              <Link
                key={item.title}
                href={item.href}
                className="block border border-black/5 p-4 md:p-6 space-y-3 hover:border-accent/30 transition-colors group"
              >
                <h4 className="font-serif text-lg font-bold group-hover:text-accent transition-colors">
                  {item.title}
                </h4>
                <p className="font-sans text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                <span className="text-[9px] uppercase tracking-widest text-gray-300 font-sans group-hover:text-accent transition-colors">
                  Explore &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-6 border-t border-black/5 pt-8 md:pt-12">
          <h3 className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-sans">Connect</h3>
          <div className="font-sans text-sm text-gray-600 space-y-2">
            <p>Instagram — <a href="https://instagram.com/sangmin__02" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@sangmin__02</a></p>
            <p>Email — 준비중</p>
          </div>
        </section>

      </div>
    </main>
  );
}
