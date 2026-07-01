import type { Metadata } from "next";
import Link from "next/link";
import KoreanProjectCard from "@/components/portfolio/KoreanProjectCard";
import PortfolioEvidenceMap from "@/components/portfolio/PortfolioEvidenceMap";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";

export const metadata: Metadata = {
  title: "포트폴리오",
  description:
    "경제·경영 배경을 바탕으로 데이터 분석, 재무 리서치, 핀테크, 전략과 서비스 기획 문제를 다룬 Sangmin Lee의 포트폴리오입니다.",
  alternates: {
    canonical: "/ko/portfolio",
    languages: {
      en: "/portfolio",
      ko: "/ko/portfolio",
    },
  },
};

const capabilities = [
  {
    title: "경제·시장 분석",
    body: "국제무역과 거시경제 맥락, 대체 데이터, 시장 조사를 연결합니다.",
  },
  {
    title: "비즈니스·재무",
    body: "고객 전략, 재무제표, 기업가치평가와 산업 분석을 다룹니다.",
  },
  {
    title: "데이터·리서치",
    body: "Python, 통계, 회귀, 분류, 설명 가능한 AI와 설문 분석을 활용합니다.",
  },
  {
    title: "실행·커뮤니케이션",
    body: "대시보드, 분석 보고서, MVP와 운영 프로세스를 의사결정안으로 정리합니다.",
  },
];

export default function KoreanPortfolioPage() {
  return (
    <main lang="ko" className="min-h-screen bg-surface px-4 py-10 font-serif text-[#222] sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <header className="grid items-end gap-10 border-b border-black/5 pb-14 md:grid-cols-12 md:pb-20">
          <div className="space-y-7 md:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
                Professional Portfolio · Sangmin Lee
              </p>
              <Link
                href="/portfolio"
                hrefLang="en"
                className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-accent"
              >
                English
              </Link>
            </div>
            <h1 className="max-w-5xl break-keep text-4xl font-extrabold leading-[1.18] tracking-tight sm:text-5xl md:text-7xl">
              모호한 질문을 데이터로 풀어
              <span className="block text-accent">실행 가능한 판단으로 연결합니다.</span>
            </h1>
            <p className="max-w-3xl break-keep font-sans text-sm leading-relaxed text-gray-600 md:text-base">
              경제와 경영의 맥락 위에서 데이터 분석과 재무 리서치를 활용해 고객, 시장,
              기업과 서비스의 문제를 살펴봅니다. 근거가 말해 주는 것과 아직 불확실한 것을
              구분하고, 다음 의사결정에 필요한 실질적인 시사점을 만드는 데 집중합니다.
            </p>
          </div>

          <div className="space-y-5 font-sans md:col-span-4 md:border-l md:border-black/5 md:pl-8">
            <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400">
              분석 접근 방식
            </p>
            <ol className="space-y-3 text-sm text-gray-700">
              {["비즈니스·연구 질문", "근거와 데이터", "분석", "해석", "실무적 의사결정"].map(
                (step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-[10px] text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </header>

        <section className="space-y-10">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-7">
              <p className="font-sans text-[10px] font-bold tracking-[0.18em] text-gray-400">
                소개
              </p>
              <h2 className="break-keep text-3xl font-bold tracking-tight md:text-4xl">
                경제와 비즈니스의 맥락을 데이터로 검토합니다.
              </h2>
            </div>
            <p className="break-keep font-sans text-sm leading-relaxed text-gray-600 md:col-span-5">
              광운대학교 국제통상학 전공·경영학 복수전공으로 2027년 2월 졸업 예정입니다.
              데이터 분석, 재무·시장 분석, 핀테크, 전략, BizOps와 서비스 기획 분야에
              관심을 두고 있습니다.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden border border-black/5 bg-black/5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <article key={capability.title} className="space-y-3 bg-[#FAF9F6] p-6 md:p-7">
                <h3 className="text-lg font-bold text-accent">{capability.title}</h3>
                <p className="break-keep font-sans text-sm leading-relaxed text-gray-600">
                  {capability.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <PortfolioEvidenceMap locale="ko" />

        <section className="space-y-10" id="cases">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-4">
              <p className="font-sans text-[10px] font-bold tracking-[0.18em] text-gray-400">
                주요 프로젝트
              </p>
              <h2 className="break-keep text-3xl font-bold tracking-tight md:text-4xl">
                일곱 개의 질문을 근거 중심의 사례로 정리했습니다.
              </h2>
            </div>
            <p className="max-w-md break-keep font-sans text-sm leading-relaxed text-gray-500">
              측정된 결과와 제안한 실행안, 시뮬레이션, 추가 검증이 필요한 부분을 명확히
              구분했습니다.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {koreanPortfolioProjects.map((project) => (
              <KoreanProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-y border-black/5 py-12 md:grid-cols-12 md:py-16">
          <div className="space-y-4 md:col-span-4">
            <p className="font-sans text-[10px] font-bold tracking-[0.18em] text-gray-400">
              공개 이력서 요약
            </p>
            <h2 className="text-3xl font-bold tracking-tight">한눈에 보기</h2>
          </div>
          <div className="grid gap-8 font-sans md:col-span-8 md:grid-cols-2">
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p className="font-bold text-[#222]">학력</p>
              <p>광운대학교</p>
              <p>국제통상학 · 경영학 복수전공</p>
              <p>2027년 2월 졸업 예정 · GPA 3.79/4.50</p>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p className="font-bold text-[#222]">연락처</p>
              <a className="block text-accent hover:underline" href="mailto:aquariusmin01@naver.com">
                aquariusmin01@naver.com
              </a>
              <a
                className="block text-accent hover:underline"
                href="https://github.com/aquariusmin"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/aquariusmin
              </a>
              <Link className="inline-block text-accent hover:underline" href="/about">
                프로필 더 보기 &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
