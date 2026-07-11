import { koreanPortfolioProjects } from "@/data/portfolio.ko";
import { portfolioProjects } from "@/data/portfolio";
import { portfolioCardChips, type EvidenceLocale } from "@/data/portfolioEvidence";
import type { PortfolioMode } from "@/data/portfolioRouting";
import PrintControls from "@/components/portfolio/PrintControls";

export default function PortfolioPrintContent({
  locale,
  mode = "normal",
}: {
  locale: EvidenceLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";
  const projects = isKorean ? koreanPortfolioProjects : portfolioProjects;

  return (
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui portfolio-print bg-white text-[#202020]">
      <PrintControls locale={locale} mode={mode} />
      <article className="mx-auto max-w-[210mm] bg-white px-6 py-8 sm:px-10">
        <header className="portfolio-print-section border-b-2 border-accent pb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate">Professional Portfolio</p>
              <h1 className="mt-3 font-serif text-4xl font-extrabold tracking-tight">{isKorean ? "이상민" : "Sangmin Lee"}</h1>
            </div>
            <div className="text-right text-[11px] leading-relaxed text-gray-600">
              <p>aquariusmin01@naver.com</p>
              <p>github.com/aquariusmin</p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl break-keep text-lg font-semibold leading-relaxed text-accent">
            {isKorean
              ? "데이터로 비즈니스 문제를 분석하고, 실제 의사결정에 쓸 수 있는 결론으로 연결합니다."
              : "Economics and business student turning data, financial research, and service thinking into practical decisions."}
          </p>
          <p className="mt-3 max-w-3xl break-keep text-xs leading-relaxed text-gray-600">
            {isKorean
              ? "고객 분석, 대체 데이터 경제 연구, 기업가치평가, 핀테크 시스템, 서비스 MVP 기획을 질문 → 근거 → 분석 → 해석 → 의사결정의 흐름으로 정리했습니다."
              : "Customer analytics, alternative-data economics, corporate valuation, fintech systems, and service MVP planning—structured from question to evidence, analysis, interpretation, and decision value."}
          </p>
        </header>

        <section className="portfolio-print-section mt-7 grid grid-cols-2 gap-px border border-black/10 bg-black/10 sm:grid-cols-4">
          {(isKorean
            ? ["경제·시장 분석", "비즈니스·재무", "데이터·리서치", "실행·커뮤니케이션"]
            : ["Economics & Markets", "Business & Finance", "Data & Research", "Execution & Communication"]
          ).map((item) => <p key={item} className="bg-white p-3 text-[10px] font-bold text-accent">{item}</p>)}
        </section>

        <section className="mt-9">
          <div className="portfolio-print-section mb-5">
            <p className={`text-[9px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>{isKorean ? "프로젝트 요약" : "Case study summary"}</p>
            <h2 className="mt-2 font-serif text-2xl font-bold">{isKorean ? "일곱 개의 근거 중심 사례" : "Seven evidence-led cases"}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <article key={project.slug} className={`portfolio-print-card border border-black/10 p-4 ${index === 4 ? "portfolio-print-page-break" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">Case {project.number}</p>
                  <p className="text-right text-[8px] font-semibold text-slate">{project.category}</p>
                </div>
                <h3 className="mt-2 font-serif text-base font-bold leading-tight">{project.title}</h3>
                <p className="mt-3 break-keep text-[10px] leading-relaxed text-gray-700">
                  <span className="font-bold text-ink">{isKorean ? "질문 · " : "Question · "}</span>{project.question}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(portfolioCardChips[project.slug] ?? []).map((chip) => (
                    <span key={chip.en} className="bg-surface-muted px-2 py-1 text-[8px] font-bold text-gray-600">{chip[locale]}</span>
                  ))}
                </div>
                <p className="mt-3 break-keep text-[10px] leading-relaxed text-gray-600">
                  <span className="font-bold text-ink">{isKorean ? "의사결정 가치 · " : "Decision value · "}</span>{project.decisionValue}
                </p>
                {project.caution && (
                  <p className="mt-3 break-keep border-l-2 border-amber-700/25 pl-2 text-[9px] leading-relaxed text-gray-500">
                    <span className="font-bold">{isKorean ? "해석 범위 · " : "Boundary · "}</span>{project.caution}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <footer className="portfolio-print-section mt-8 border-t border-black/10 pt-4 text-[9px] leading-relaxed text-gray-500">
          <p>{isKorean ? "본 문서는 공개용 요약본이며, 전화번호와 미검증 성과를 포함하지 않습니다." : "This is a public-safe summary and excludes phone information and unverified outcome claims."}</p>
        </footer>
      </article>
    </main>
  );
}
