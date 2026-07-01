import type { Metadata } from "next";
import KoreanProjectCard from "@/components/portfolio/KoreanProjectCard";
import PortfolioClosingCta from "@/components/portfolio/PortfolioClosingCta";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import SelectedEvidenceHighlights from "@/components/portfolio/SelectedEvidenceHighlights";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";

export const metadata: Metadata = {
  title: "포트폴리오",
  description: "경제·경영 지식과 데이터 분석을 바탕으로 비즈니스 문제를 구조화하고 실무적 인사이트로 연결하는 이상민의 포트폴리오입니다.",
  alternates: {
    canonical: "/ko/portfolio",
    languages: { en: "/portfolio", ko: "/ko/portfolio" },
  },
};

const capabilities = [
  { title: "경제·시장 분석", body: "국제무역과 거시경제 맥락, 대체 데이터, 시장조사를 연결합니다." },
  { title: "비즈니스·재무", body: "고객 전략, 재무제표, 기업가치평가와 산업 분석을 다룹니다." },
  { title: "데이터·리서치", body: "Python, 통계, 회귀, 분류, 설명 가능한 AI와 설문 분석을 활용합니다." },
  { title: "실행·커뮤니케이션", body: "대시보드, 분석 보고서, MVP, 운영 흐름과 의사결정 제안을 만듭니다." },
];

export default function KoreanPortfolioPage() {
  return (
    <main lang="ko" className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-[#222] sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <PortfolioHero locale="ko" />

        <section className="space-y-10">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-7">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400">역량 요약</p>
              <h2 className="break-keep text-3xl font-bold tracking-tight md:text-4xl">비즈니스 맥락을 근거로 검토합니다.</h2>
            </div>
            <p className="break-keep text-sm leading-relaxed text-gray-600 md:col-span-5">
              의사결정 질문에서 출발해 적절한 근거를 선택하고, 확인된 결과와 가정, 추가 검증 과제를 구분하는 방식으로 분석합니다.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden border border-black/5 bg-black/5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <article key={capability.title} className="space-y-3 bg-[#FAF9F6] p-6 md:p-7">
                <h3 className="text-lg font-bold text-accent">{capability.title}</h3>
                <p className="break-keep text-sm leading-relaxed text-gray-600">{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <SelectedEvidenceHighlights locale="ko" />

        <section className="space-y-10" id="cases">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400">주요 프로젝트</p>
              <h2 className="break-keep text-3xl font-bold tracking-tight md:text-4xl">근거 중심으로 정리한 일곱 개의 사례입니다.</h2>
            </div>
            <p className="max-w-md break-keep text-sm leading-relaxed text-gray-500">
              각 사례는 질문, 근거, 분석, 해석, 실무적 의사결정 가치의 흐름으로 구성했습니다.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {koreanPortfolioProjects.map((project) => <KoreanProjectCard key={project.slug} project={project} />)}
          </div>
        </section>

        <PortfolioClosingCta locale="ko" />
      </div>
    </main>
  );
}
