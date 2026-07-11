import Link from "next/link";
import ProjectEvidence from "@/components/portfolio/ProjectEvidence";
import type { PortfolioProject } from "@/data/portfolio";
import {
  getPortfolioBasePath,
  getPortfolioCasePath,
  getPortfolioPrintPath,
  type PortfolioLocale,
  type PortfolioMode,
} from "@/data/portfolioRouting";

const labels = {
  en: {
    back: "Portfolio",
    period: "Period",
    role: "Role",
    sections: [
      ["01 · Business / research question", "The question"],
      ["02 · Evidence", "What the analysis used"],
      ["03 · Analysis", "How the work progressed"],
      ["04 · Interpretation", "Main insight"],
      ["05 · Practical decision", "Decision value"],
      ["06 · Validation", "Limitations and next checks"],
      ["07 · Visual evidence", "Evidence, with boundaries"],
    ],
    boundary: "Important boundary:",
    previous: "Previous case",
    next: "Next case",
    print: "Print / Save as PDF",
  },
  ko: {
    back: "포트폴리오",
    period: "기간",
    role: "역할",
    sections: [
      ["01 · 비즈니스·연구 질문", "무엇을 확인하려 했는가"],
      ["02 · 근거와 데이터", "어떤 자료를 사용했는가"],
      ["03 · 분석 과정", "어떻게 분석하고 구현했는가"],
      ["04 · 해석", "무엇을 알 수 있었는가"],
      ["05 · 실무적 시사점", "어떤 판단에 활용할 수 있는가"],
      ["06 · 추가 검증", "한계와 다음 과제"],
      ["07 · 시각적 근거", "확인된 근거와 해석 범위"],
    ],
    boundary: "해석 시 유의사항:",
    previous: "이전 프로젝트",
    next: "다음 프로젝트",
    print: "인쇄 · PDF로 저장",
  },
} as const;

export default function PortfolioCaseStudy({
  project,
  projects,
  locale,
  mode = "normal",
}: {
  project: PortfolioProject;
  projects: PortfolioProject[];
  locale: PortfolioLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";
  const copy = labels[locale];
  const currentIndex = projects.findIndex((item) => item.slug === project.slug);
  const previous = projects[(currentIndex - 1 + projects.length) % projects.length];
  const next = projects[(currentIndex + 1) % projects.length];
  const alternateLocale: PortfolioLocale = isKorean ? "en" : "ko";
  const overviewPath = getPortfolioBasePath(locale, mode);

  return (
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-[#222] sm:px-6 md:px-10 md:py-16">
      <article className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={overviewPath} className={`text-[11px] font-semibold text-slate transition-colors hover:text-accent ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>
            &larr; {mode === "submission" && !isKorean ? "Submission " : ""}{mode === "submission" && isKorean ? "제출용 " : ""}{copy.back}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {mode === "submission" && (
              <>
                <a href="mailto:aquariusmin01@naver.com" className="text-[11px] font-semibold text-slate transition-colors hover:text-accent">
                  Email
                </a>
                <a href="https://github.com/aquariusmin" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-slate transition-colors hover:text-accent">
                  GitHub
                </a>
                <Link href={getPortfolioPrintPath(locale, mode)} className="text-[11px] font-semibold text-slate transition-colors hover:text-accent">
                  {copy.print}
                </Link>
              </>
            )}
            <Link href={getPortfolioCasePath(alternateLocale, mode, project.slug)} hrefLang={alternateLocale} className={`text-[11px] font-semibold text-slate transition-colors hover:text-accent ${isKorean ? "uppercase tracking-[0.2em]" : "tracking-[0.14em]"}`}>
              {isKorean ? "English" : "한국어"}
            </Link>
          </div>
        </div>

        <header className="mt-10 space-y-8 border-b border-hairline pb-12 md:mt-14 md:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="eyebrow text-accent">Case {project.number}</span>
            <span className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>{project.category}</span>
          </div>
          <div className="space-y-5">
            <h1 className="font-serif text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">{project.title}</h1>
            <p className="max-w-3xl break-keep text-base leading-relaxed text-gray-600 md:text-lg">{project.summary}</p>
          </div>
          <div className="grid gap-4 border-y border-hairline py-5 text-sm text-gray-600 sm:grid-cols-2">
            <p><span className="font-bold text-[#222]">{copy.period}</span> · {project.period}</p>
            <p><span className="font-bold text-[#222]">{copy.role}</span> · {project.role}</p>
          </div>
        </header>

        <div className="space-y-16 py-14 md:space-y-24 md:py-20">
          <CaseSection label={copy.sections[0][0]} title={copy.sections[0][1]} isKorean={isKorean}>
            <p className="break-keep border-l-4 border-accent bg-surface px-6 py-7 font-serif text-xl font-semibold leading-relaxed md:px-8 md:py-9 md:text-2xl">{project.question}</p>
          </CaseSection>

          <CaseSection label={copy.sections[1][0]} title={copy.sections[1][1]} isKorean={isKorean}>
            <div className="grid gap-4 md:grid-cols-3">
              {project.evidence.map((item) => <div key={item} className="break-keep border border-border-light bg-white p-5 text-sm leading-relaxed text-gray-600">{item}</div>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tools.map((tool) => <span key={tool} className="bg-surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate">{tool}</span>)}
            </div>
          </CaseSection>

          <CaseSection label={copy.sections[2][0]} title={copy.sections[2][1]} isKorean={isKorean}>
            <ol className="divide-y divide-hairline border-y border-hairline">
              {project.process.map((step, index) => (
                <li key={step.title} className="grid gap-4 py-6 md:grid-cols-12 md:py-8">
                  <span className="font-mono text-xs text-accent md:col-span-1">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg font-bold md:col-span-3">{step.title}</h3>
                  <p className="break-keep text-sm leading-relaxed text-gray-600 md:col-span-8">{step.description}</p>
                </li>
              ))}
            </ol>
          </CaseSection>

          <CaseSection label={copy.sections[3][0]} title={copy.sections[3][1]} isKorean={isKorean}>
            <div className="grid gap-4 md:grid-cols-2">
              {project.insights.map((insight) => <p key={insight} className="break-keep border border-border-light bg-white p-6 text-sm leading-relaxed text-gray-700">{insight}</p>)}
            </div>
            {project.caution && <div className="mt-5 break-keep border border-amber-700/15 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900"><span className="font-bold">{copy.boundary}</span> {project.caution}</div>}
          </CaseSection>

          <CaseSection label={copy.sections[4][0]} title={copy.sections[4][1]} isKorean={isKorean}>
            <p className="max-w-4xl break-keep font-serif text-2xl font-semibold leading-relaxed text-accent md:text-3xl">{project.decisionValue}</p>
          </CaseSection>

          <CaseSection label={copy.sections[5][0]} title={copy.sections[5][1]} isKorean={isKorean}>
            <ul className="grid gap-3 md:grid-cols-2">
              {project.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 border border-border-light bg-white p-5 text-sm leading-relaxed text-gray-600">
                  <span className="mt-1 text-accent">•</span><span className="break-keep">{limitation}</span>
                </li>
              ))}
            </ul>
          </CaseSection>

          <CaseSection label={copy.sections[6][0]} title={copy.sections[6][1]} isKorean={isKorean}>
            <div id="evidence" className="scroll-mt-28"><ProjectEvidence slug={project.slug} locale={locale} /></div>
          </CaseSection>
        </div>

        <nav aria-label={isKorean ? "프로젝트 이동" : "Case study navigation"} className="grid gap-px border-y border-hairline bg-hairline sm:grid-cols-2">
          <Link href={getPortfolioCasePath(locale, mode, previous.slug)} className="group bg-surface p-6 transition-colors hover:bg-white md:p-8">
            <span className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>{copy.previous}</span>
            <p className="mt-3 font-serif text-lg font-bold transition-colors group-hover:text-accent">&larr; {previous.title}</p>
          </Link>
          <Link href={getPortfolioCasePath(locale, mode, next.slug)} className="group bg-surface p-6 text-right transition-colors hover:bg-white md:p-8">
            <span className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>{copy.next}</span>
            <p className="mt-3 font-serif text-lg font-bold transition-colors group-hover:text-accent">{next.title} &rarr;</p>
          </Link>
        </nav>
      </article>
    </main>
  );
}

function CaseSection({ label, title, children, isKorean }: { label: string; title: string; children: React.ReactNode; isKorean: boolean }) {
  return (
    <section>
      <div className="mb-7 space-y-2">
        <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>{label}</p>
        <h2 className="break-keep font-serif text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
