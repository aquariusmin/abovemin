import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/motion/Reveal';

export const metadata: Metadata = {
  title: 'About',
  description: 'Sangmin Lee — 사진, 데이터, 경제와 비즈니스를 연결하는 phorage studio.',
};

const WHAT_I_DO = [
  { title: 'Archive', desc: '필름과 디지털로 담은 사진들을 앨범 단위로 정리합니다.', href: '/archive' },
  { title: 'Shop', desc: '자연에서 영감 받은 포스터, 문구, 라이프스타일 소품을 소개합니다.', href: '/shop' },
  { title: 'Portfolio', desc: '데이터 분석, 경제·재무 연구, 핀테크와 서비스 기획 사례를 의사결정 중심으로 정리합니다.', href: '/portfolio' },
  { title: 'Lab', desc: '페이퍼 트레이딩 검증 환경에서 전략과 운영 데이터를 관찰합니다.', href: '/lab', italic: true },
];

export default function About() {
  return (
    <main className="min-h-screen bg-canvas text-ink-body px-5 sm:px-6 md:px-10 py-14 md:py-24">
      <div className="max-w-3xl mx-auto space-y-16 md:space-y-24">

        {/* Hero */}
        <Reveal as="header" className="space-y-6" y={16}>
          <p className="eyebrow text-accent">About</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink break-keep">
            빛을 수집하고,<br />
            세상을 <span className="text-accent">분석</span>합니다.
          </h1>
          <div className="w-16 h-[2px] bg-accent" />
        </Reveal>

        {/* Story */}
        <Reveal as="section" className="space-y-6 text-base md:text-[17px] text-slate leading-relaxed break-keep">
          <p>
            <strong className="font-serif text-lg text-ink font-medium">phorage</strong>는 photography와 forage의
            합성어입니다. 무심코 지나친 숲의 색깔, 도시의 틈새에 자라난 초록 — 일상 속에서 발견한 빛을 채집하고 기록합니다.
          </p>
          <p>
            사진 아카이브와 소품샵을 운영하며, 퀀트와 데이터에 관심이 많아 글로벌 시장을 관찰하고 분석하는{' '}
            <span className="italic">Lab</span>을 함께 만들어가고 있습니다.
          </p>
          <p>
            국제통상학과 경영학을 공부하며 고객, 시장, 재무 데이터를 실제 의사결정으로 연결하는 분석을 지향합니다.
            데이터 분석, 경제 연구, 재무 분석, 핀테크, 전략과 서비스 기획 프로젝트는
            <Link href="/portfolio" className="ml-1 link-underline text-accent">Portfolio</Link>에 정리했습니다.
          </p>
        </Reveal>

        {/* What I do */}
        <section className="space-y-8">
          <Reveal as="header"><h2 className="eyebrow text-muted">What I do</h2></Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {WHAT_I_DO.map((item, i) => (
              <Reveal key={item.title} className="h-full" delay={i * 0.06} y={16}>
                <Link
                  href={item.href}
                  className="glass glass-interactive group h-full p-6 md:p-7 flex flex-col gap-3"
                >
                  <h3 className={`font-serif text-xl font-medium text-ink group-hover:text-accent transition-colors ${item.italic ? 'italic' : ''}`}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate leading-relaxed break-keep flex-1">{item.desc}</p>
                  <span className="eyebrow text-muted group-hover:text-accent transition-colors">Explore →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Contact */}
        <Reveal as="section" className="space-y-6 border-t border-hairline pt-10 md:pt-12">
          <h2 className="eyebrow text-muted">Connect</h2>
          <div className="text-base text-ink-body space-y-3">
            <p>
              Instagram —{' '}
              <a href="https://instagram.com/sangmin__02" target="_blank" rel="noopener noreferrer" className="link-underline text-accent">
                @sangmin__02
              </a>
            </p>
            <p>
              Email —{' '}
              <a href="mailto:aquariusmin01@naver.com" className="link-underline text-accent">
                aquariusmin01@naver.com
              </a>
            </p>
            <p>
              GitHub —{' '}
              <a href="https://github.com/aquariusmin" target="_blank" rel="noopener noreferrer" className="link-underline text-accent">
                aquariusmin
              </a>
            </p>
          </div>
        </Reveal>

      </div>
    </main>
  );
}
