import {
  getKoreanSubmissionPortfolioProjects,
  koreanPortfolioProjects,
} from "@/data/portfolio.ko";
import { portfolioProjects } from "@/data/portfolio";
import { portfolioCapabilities } from "@/data/portfolioCapabilities";
import { portfolioCardChips, type EvidenceLocale } from "@/data/portfolioEvidence";
import { getPortfolioBasePath, type PortfolioMode } from "@/data/portfolioRouting";
import PrintControls from "@/components/portfolio/PrintControls";

export default function PortfolioPrintContent({
  locale,
  mode = "normal",
}: {
  locale: EvidenceLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";
  const isKoreanSubmission = isKorean && mode === "submission";
  const projects = isKoreanSubmission
    ? getKoreanSubmissionPortfolioProjects()
    : isKorean
      ? koreanPortfolioProjects
      : portfolioProjects;
  const portfolioUrl = `https://abovemin.com${getPortfolioBasePath(locale, mode)}`;
  const githubUrl = "https://github.com/aquariusmin";

  return (
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui portfolio-print bg-white text-[#202020]">
      <PrintControls locale={locale} mode={mode} />
      <article className="mx-auto max-w-[210mm] bg-white px-6 py-8 sm:px-10">
        <header className="portfolio-print-section border-b-2 border-accent pb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate">
                Professional Portfolio
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight">{isKorean ? "이상민" : "Sangmin Lee"}</h1>
            </div>
            <div className="max-w-[92mm] text-right text-[11px] leading-relaxed text-slate">
              <p><span className="font-semibold text-ink">{isKorean ? "메일" : "Email"}</span> · aquariusmin01@naver.com</p>
              <p><span className="font-semibold text-ink">GitHub</span> · {githubUrl}</p>
              <p><span className="font-semibold text-ink">{isKorean ? "웹 포트폴리오" : "Portfolio page"}</span> · {portfolioUrl}</p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl break-keep text-lg font-semibold leading-relaxed text-accent">
            {isKoreanSubmission
              ? "데이터의 가정을 검증하고, 의사결정 가능한 지표로 바꿉니다."
              : isKorean
                ? "데이터를 보고, 시장 맥락을 붙여, 다음 판단까지 정리합니다."
              : "International Trade major and Business Administration double-major candidate, preparing for work across analytics, financial research, and service planning."}
          </p>
          <p className="mt-3 max-w-3xl break-keep text-xs leading-relaxed text-slate">
            {isKoreanSubmission
              ? "대표 사례는 부산 도시철도 체류 분석, 통신 고객 이탈 XAI, Satellite GDP Insight입니다. 북극항로 등 탐색형 작업은 보조 자료로 낮춰 배치했습니다."
              : isKorean
                ? "고객 분석, 대체 데이터 경제 연구, 기업가치평가, 핀테크 시스템, 서비스 MVP 기획을 다루며 수치의 출처와 해석 범위를 함께 기록했습니다."
              : "The work spans customer analytics, alternative-data economics, corporate valuation, fintech systems, and service MVP planning, with claim boundaries stated beside the numbers."}
          </p>
        </header>

        <section className="portfolio-print-section mt-7 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {portfolioCapabilities[locale].map((capability) => (
            <p key={capability.title} className="bg-white p-3 text-[10px] font-semibold text-accent">{capability.title}</p>
          ))}
        </section>

        <section className="mt-9">
          <div className="portfolio-print-section mb-5">
            <p className={`text-[9px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>{isKorean ? "프로젝트 요약" : "Case study summary"}</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">
              {isKoreanSubmission
                ? "대표 3개와 Explore 작업"
                : isKorean
                  ? "지금 보여줄 수 있는 일곱 가지 작업"
                  : "Seven projects I can discuss in detail"}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => (
              <article key={project.slug} className={`portfolio-print-card border border-black/10 p-4 ${index === 4 ? "portfolio-print-page-break" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">Case {project.number}</p>
                  <p className="text-right text-[8px] font-semibold text-slate">{project.category}</p>
                </div>
                <h3 className="mt-2 font-serif text-base font-semibold leading-tight">{project.title}</h3>
                <p className="mt-3 break-keep text-[10px] leading-relaxed text-ink-body">
                  <span className="font-semibold text-ink">{isKorean ? "질문 · " : "Question · "}</span>{project.question}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(portfolioCardChips[project.slug] ?? []).map((chip) => (
                    <span key={chip.en} className="bg-surface-muted px-2 py-1 text-[8px] font-semibold text-slate">{chip[locale]}</span>
                  ))}
                </div>
                <p className="mt-3 break-keep text-[10px] leading-relaxed text-slate">
                  <span className="font-semibold text-ink">{isKorean ? "의사결정 가치 · " : "Decision value · "}</span>{project.decisionValue}
                </p>
                {project.caution && (
                  <p className="mt-3 break-keep border-l-2 border-brick/30 pl-2 text-[9px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold">{isKorean ? "해석 범위 · " : "Boundary · "}</span>{project.caution}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <footer className="portfolio-print-section mt-8 border-t border-black/10 pt-4 text-[9px] leading-relaxed text-muted-foreground">
          <p>{isKorean ? "본 문서는 공개용 요약본이며, 전화번호와 미검증 성과를 포함하지 않습니다." : "This is a public-safe summary and excludes phone information and unverified outcome claims."}</p>
          <p className="mt-1">{isKorean ? "웹에서 프로젝트 상세와 원본 저장소 링크를 함께 확인할 수 있습니다." : "The web portfolio includes detailed cases and links to the source repositories."}</p>
        </footer>
      </article>
    </main>
  );
}
