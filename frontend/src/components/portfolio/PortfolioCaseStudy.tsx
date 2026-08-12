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
    source: "Source",
    story: {
      label: "Quick read",
      title: "The through-line of the work.",
      items: [
        ["Open", "The starting question"],
        ["Build", "What I checked"],
        ["Turn", "What changed my view"],
        ["Close", "Where I draw the line"],
      ],
    },
    sections: [
      ["01 · Start", "The question I began with"],
      ["02 · Material", "The data and evidence"],
      ["03 · Work", "How I worked through it"],
      ["04 · Takeaway", "What the numbers suggested"],
      ["05 · Use", "Where this helps"],
      ["06 · Boundary", "What still needs checking"],
      ["07 · Figures", "Tables and figures"],
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
    source: "원본",
    story: {
      label: "프로젝트 흐름",
      title: "먼저 흐름을 잡으면 이렇습니다.",
      items: [
        ["질문", "처음 잡은 문제"],
        ["근거", "확인한 자료"],
        ["판단", "생각이 정리된 부분"],
        ["범위", "아직 선을 그은 부분"],
      ],
    },
    sections: [
      ["01 · 시작", "처음 잡은 질문"],
      ["02 · 근거", "제가 확인한 자료"],
      ["03 · 전개", "분석은 이렇게 진행했습니다"],
      ["04 · 결론", "숫자에서 읽은 것"],
      ["05 · 적용", "어디에 활용할 수 있나"],
      ["06 · 경계", "아직 단정하지 않는 부분"],
      ["07 · 근거 화면", "표와 그래프로 확인하기"],
    ],
    boundary: "해석 시 유의사항:",
    previous: "이전 프로젝트",
    next: "다음 프로젝트",
    print: "인쇄 · PDF로 저장",
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
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-ink sm:px-6 md:px-10 md:py-16">
      <article className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={overviewPath} className={`text-[11px] font-semibold text-slate transition-colors hover:text-accent ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>
            &larr; {copy.back}
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
            <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">{project.title}</h1>
            <p className="max-w-3xl break-keep text-base leading-relaxed text-slate md:text-lg">{project.summary}</p>
          </div>
          <div className={`grid gap-4 border-y border-hairline py-5 text-sm text-slate ${project.sourceUrl ? "sm:grid-cols-2 lg:grid-cols-[minmax(9rem,0.8fr)_minmax(24rem,1.8fr)_minmax(10rem,1fr)]" : "sm:grid-cols-2"}`}>
            <p className="break-keep"><span className="font-semibold text-ink">{copy.period}</span> · {project.period}</p>
            <p className="break-keep"><span className="font-semibold text-ink">{copy.role}</span> · {project.role}</p>
            {project.sourceUrl && (
              <p className="break-keep">
                <span className="font-semibold text-ink">{copy.source}</span> ·{" "}
                <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="link-underline text-accent">
                  {isKorean ? "GitHub 저장소" : "GitHub repository"}
                </a>
              </p>
            )}
          </div>
        </header>

        <div className="space-y-16 py-14 md:space-y-24 md:py-20">
          <StoryArc project={project} copy={copy} isKorean={isKorean} />

          <CaseSection label={copy.sections[0][0]} title={copy.sections[0][1]} isKorean={isKorean}>
            <p className="break-keep border-l-4 border-accent bg-surface px-6 py-7 font-serif text-xl font-semibold leading-relaxed md:px-8 md:py-9 md:text-2xl">{project.question}</p>
          </CaseSection>

          <CaseSection label={copy.sections[1][0]} title={copy.sections[1][1]} isKorean={isKorean}>
            <div className="grid gap-4 md:grid-cols-3">
              {project.evidence.map((item) => <div key={item} className="break-keep border border-border-light bg-white p-5 text-sm leading-relaxed text-slate">{item}</div>)}
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
                  <h3 className="text-lg font-semibold md:col-span-3">{step.title}</h3>
                  <p className="break-keep text-sm leading-relaxed text-slate md:col-span-8">{step.description}</p>
                </li>
              ))}
            </ol>
          </CaseSection>

          <CaseSection label={copy.sections[3][0]} title={copy.sections[3][1]} isKorean={isKorean}>
            <div className="grid gap-4 md:grid-cols-2">
              {project.insights.map((insight) => <p key={insight} className="break-keep border border-border-light bg-white p-6 text-sm leading-relaxed text-ink-body">{insight}</p>)}
            </div>
            {project.caution && <div className="mt-5 break-keep border border-brick/20 bg-brick/[0.05] px-5 py-4 text-sm leading-relaxed text-brick"><span className="font-semibold">{copy.boundary}</span> {project.caution}</div>}
          </CaseSection>

          <CaseSection label={copy.sections[4][0]} title={copy.sections[4][1]} isKorean={isKorean}>
            <p className="max-w-4xl break-keep font-serif text-2xl font-semibold leading-relaxed text-accent md:text-3xl">{project.decisionValue}</p>
          </CaseSection>

          <CaseSection label={copy.sections[5][0]} title={copy.sections[5][1]} isKorean={isKorean}>
            <ul className="grid gap-3 md:grid-cols-2">
              {project.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 border border-border-light bg-white p-5 text-sm leading-relaxed text-slate">
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
            <p className="mt-3 font-serif text-lg font-semibold transition-colors group-hover:text-accent">&larr; {previous.title}</p>
          </Link>
          <Link href={getPortfolioCasePath(locale, mode, next.slug)} className="group bg-surface p-6 text-right transition-colors hover:bg-white md:p-8">
            <span className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "uppercase tracking-[0.2em]"}`}>{copy.next}</span>
            <p className="mt-3 font-serif text-lg font-semibold transition-colors group-hover:text-accent">{next.title} &rarr;</p>
          </Link>
        </nav>
      </article>
    </main>
  );
}

function StoryArc({
  project,
  copy,
  isKorean,
}: {
  project: PortfolioProject;
  copy: typeof labels.en | typeof labels.ko;
  isKorean: boolean;
}) {
  const storyBodies = project.storyArc;
  const processFlow = project.process.map((step) => step.title).join(isKorean ? " → " : " -> ");
  const arcItems = [
    {
      label: copy.story.items[0][0],
      title: copy.story.items[0][1],
      body: storyBodies?.[0] ?? project.question,
    },
    {
      label: copy.story.items[1][0],
      title: copy.story.items[1][1],
      body: storyBodies?.[1] ?? (isKorean
        ? `${project.evidence[0]}를 먼저 확인하고, ${processFlow} 순서로 풀었습니다.`
        : `I started with ${project.evidence[0]} and moved through ${processFlow}.`),
    },
    {
      label: copy.story.items[2][0],
      title: copy.story.items[2][1],
      body: storyBodies?.[2] ?? project.insights[0],
    },
    {
      label: copy.story.items[3][0],
      title: copy.story.items[3][1],
      body: storyBodies?.[3] ?? project.caution ?? project.limitations[0],
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
          {copy.story.label}
        </p>
        <h2 className="break-keep font-serif text-3xl font-semibold tracking-tight">{copy.story.title}</h2>
      </div>
      <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
        {arcItems.map((item) => (
          <article key={item.label} className="bg-white p-5 md:p-6">
            <p className={`text-[10px] font-semibold text-accent ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.18em]"}`}>
              {item.label}
            </p>
            <h3 className="mt-3 break-keep text-lg font-semibold text-ink">{item.title}</h3>
            <p className="mt-3 break-keep text-sm leading-relaxed text-slate">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CaseSection({ label, title, children, isKorean }: { label: string; title: string; children: React.ReactNode; isKorean: boolean }) {
  return (
    <section>
      <div className="mb-7 space-y-2">
        <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>{label}</p>
        <h2 className="break-keep font-serif text-3xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
