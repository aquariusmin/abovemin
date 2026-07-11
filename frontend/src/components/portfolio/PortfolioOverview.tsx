import KoreanProjectCard from "@/components/portfolio/KoreanProjectCard";
import PortfolioClosingCta from "@/components/portfolio/PortfolioClosingCta";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import ProjectCard from "@/components/portfolio/ProjectCard";
import SelectedEvidenceHighlights from "@/components/portfolio/SelectedEvidenceHighlights";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";
import { portfolioProjects } from "@/data/portfolio";
import {
  getPortfolioBasePath,
  type PortfolioLocale,
  type PortfolioMode,
} from "@/data/portfolioRouting";

const capabilities = {
  en: [
    { title: "Economics & Markets", body: "International trade, macroeconomic context, alternative data, and market research." },
    { title: "Business & Finance", body: "Customer strategy, financial statements, corporate valuation, and industry analysis." },
    { title: "Data & Research", body: "Python, statistics, regression, classification, explainable AI, and survey analysis." },
    { title: "Execution & Communication", body: "Dashboards, analytical reports, MVPs, operating workflows, and decision recommendations." },
  ],
  ko: [
    { title: "경제·시장 분석", body: "국제무역과 거시경제 맥락, 대체 데이터, 시장조사를 연결합니다." },
    { title: "비즈니스·재무", body: "고객 전략, 재무제표, 기업가치평가와 산업 분석을 다룹니다." },
    { title: "데이터·리서치", body: "Python, 통계, 회귀, 분류, 설명 가능한 AI와 설문 분석을 활용합니다." },
    { title: "실행·커뮤니케이션", body: "대시보드, 분석 보고서, MVP, 운영 흐름과 의사결정 제안을 만듭니다." },
  ],
};

export default function PortfolioOverview({
  locale,
  mode = "normal",
}: {
  locale: PortfolioLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";
  const projects = isKorean ? koreanPortfolioProjects : portfolioProjects;
  const basePath = getPortfolioBasePath(locale, mode);

  return (
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-[#222] sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <PortfolioHero locale={locale} mode={mode} />

        <section className="space-y-10">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-7">
              <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
                {isKorean ? "역량 요약" : "Capability summary"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-bold tracking-tight md:text-4xl">
                {isKorean ? "비즈니스 맥락을 근거로 검증합니다." : "Business context, tested through evidence."}
              </h2>
            </div>
            <p className="break-keep text-sm leading-relaxed text-gray-600 md:col-span-5">
              {isKorean
                ? "의사결정 질문에서 출발해 적절한 근거를 선택하고, 확인된 결과와 가정, 추가 검증 과제를 구분하는 방식으로 분석합니다."
                : "My work begins with a decision question, selects evidence appropriate to that question, and finishes by separating supported findings from assumptions and next validation steps."}
            </p>
          </div>
          <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
            {capabilities[locale].map((capability) => (
              <article key={capability.title} className="space-y-3 bg-surface p-6 md:p-7">
                <h3 className="text-lg font-bold text-accent">{capability.title}</h3>
                <p className="break-keep text-sm leading-relaxed text-gray-600">{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <SelectedEvidenceHighlights locale={locale} />

        <section className="space-y-10" id="cases">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-4">
              <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
                {isKorean ? "주요 프로젝트" : "Selected work"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-bold tracking-tight md:text-4xl">
                {isKorean ? "근거 중심으로 정리한 일곱 개의 사례입니다." : "Seven evidence-led case studies."}
              </h2>
            </div>
            <p className="max-w-md break-keep text-sm leading-relaxed text-gray-500">
              {isKorean
                ? "각 사례는 질문, 근거, 분석, 해석, 실무적 의사결정 가치의 흐름으로 구성했습니다."
                : "Each case follows the same path: question, evidence, analysis, interpretation, and practical decision value."}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) =>
              isKorean ? (
                <KoreanProjectCard key={project.slug} project={project} basePath={basePath} />
              ) : (
                <ProjectCard key={project.slug} project={project} basePath={basePath} />
              ),
            )}
          </div>
        </section>

        <PortfolioClosingCta locale={locale} mode={mode} />
      </div>
    </main>
  );
}
