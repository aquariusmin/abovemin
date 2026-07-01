import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectEvidence from "@/components/portfolio/ProjectEvidence";
import {
  getKoreanPortfolioProject,
  koreanPortfolioProjects,
} from "@/data/portfolio.ko";

export const dynamicParams = false;

export function generateStaticParams() {
  return koreanPortfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getKoreanPortfolioProject(slug);

  if (!project) {
    notFound();
  }

  return {
    title: `${project.title} · 한국어`,
    description: project.summary,
    alternates: {
      canonical: `/ko/portfolio/${slug}`,
      languages: {
        en: `/portfolio/${slug}`,
        ko: `/ko/portfolio/${slug}`,
      },
    },
  };
}

export default async function KoreanPortfolioCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getKoreanPortfolioProject(slug);

  if (!project) notFound();

  const currentIndex = koreanPortfolioProjects.findIndex((item) => item.slug === slug);
  const previous =
    koreanPortfolioProjects[
      (currentIndex - 1 + koreanPortfolioProjects.length) % koreanPortfolioProjects.length
    ];
  const next = koreanPortfolioProjects[(currentIndex + 1) % koreanPortfolioProjects.length];

  return (
    <main lang="ko" className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-[#222] sm:px-6 md:px-10 md:py-16">
      <article className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/ko/portfolio"
            className="font-sans text-[10px] font-bold tracking-[0.18em] text-gray-400 transition-colors hover:text-accent"
          >
            &larr; 포트폴리오
          </Link>
          <Link
            href={`/portfolio/${project.slug}`}
            hrefLang="en"
            className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-accent"
          >
            English
          </Link>
        </div>

        <header className="mt-10 space-y-8 border-b border-black/5 pb-12 md:mt-14 md:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4 font-sans">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Case {project.number}
            </span>
            <span className="text-[10px] font-semibold tracking-[0.1em] text-gray-400">
              {project.category}
            </span>
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {project.title}
            </h1>
            <p className="max-w-3xl break-keep font-sans text-base leading-relaxed text-gray-600 md:text-lg">
              {project.summary}
            </p>
          </div>

          <div className="grid gap-4 border-y border-black/5 py-5 font-sans text-sm text-gray-600 sm:grid-cols-2">
            <p><span className="font-bold text-[#222]">기간</span> · {project.period}</p>
            <p><span className="font-bold text-[#222]">역할</span> · {project.role}</p>
          </div>
        </header>

        <div className="space-y-16 py-14 md:space-y-24 md:py-20">
          <CaseSection label="01 · 비즈니스·연구 질문" title="무엇을 확인하려 했는가">
            <p className="break-keep border-l-4 border-accent bg-white/55 px-6 py-7 text-xl font-semibold leading-relaxed md:px-8 md:py-9 md:text-2xl">
              {project.question}
            </p>
          </CaseSection>

          <CaseSection label="02 · 근거와 데이터" title="어떤 자료를 활용했는가">
            <div className="grid gap-4 md:grid-cols-3">
              {project.evidence.map((item) => (
                <div key={item} className="break-keep border border-black/5 bg-white/55 p-5 font-sans text-sm leading-relaxed text-gray-600">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tools.map((tool) => (
                <span key={tool} className="bg-surface-muted px-3 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  {tool}
                </span>
              ))}
            </div>
          </CaseSection>

          <CaseSection label="03 · 분석 과정" title="어떻게 분석하고 구현했는가">
            <ol className="divide-y divide-black/5 border-y border-black/5">
              {project.process.map((step, index) => (
                <li key={step.title} className="grid gap-4 py-6 md:grid-cols-12 md:py-8">
                  <span className="font-mono text-xs text-accent md:col-span-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold md:col-span-3">{step.title}</h3>
                  <p className="break-keep font-sans text-sm leading-relaxed text-gray-600 md:col-span-8">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </CaseSection>

          <CaseSection label="04 · 해석" title="무엇을 알 수 있었는가">
            <div className="grid gap-4 md:grid-cols-2">
              {project.insights.map((insight) => (
                <p key={insight} className="break-keep border border-black/5 bg-white/55 p-6 font-sans text-sm leading-relaxed text-gray-700">
                  {insight}
                </p>
              ))}
            </div>
            {project.caution && (
              <div className="mt-5 break-keep border border-amber-700/15 bg-amber-50 px-5 py-4 font-sans text-sm leading-relaxed text-amber-900">
                <span className="font-bold">해석 시 유의사항:</span> {project.caution}
              </div>
            )}
          </CaseSection>

          <CaseSection label="05 · 실무적 시사점" title="어떤 판단에 활용할 수 있는가">
            <p className="max-w-4xl break-keep text-2xl font-semibold leading-relaxed text-accent md:text-3xl">
              {project.decisionValue}
            </p>
          </CaseSection>

          <CaseSection label="06 · 추가 검증" title="한계와 다음 과제">
            <ul className="grid gap-3 font-sans md:grid-cols-2">
              {project.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 border border-black/5 bg-white/40 p-5 text-sm leading-relaxed text-gray-600">
                  <span className="mt-1 text-accent">—</span>
                  <span className="break-keep">{limitation}</span>
                </li>
              ))}
            </ul>
          </CaseSection>

          <CaseSection label="07 · 시각적 근거" title="확인된 근거와 해석 범위">
            <div id="evidence" className="scroll-mt-28">
              <ProjectEvidence slug={project.slug} locale="ko" />
            </div>
          </CaseSection>
        </div>

        <nav className="grid gap-px border-y border-black/5 bg-black/5 sm:grid-cols-2">
          <Link href={`/ko/portfolio/${previous.slug}`} className="group bg-surface p-6 transition-colors hover:bg-white md:p-8">
            <span className="font-sans text-[10px] font-bold tracking-[0.12em] text-gray-400">이전 프로젝트</span>
            <p className="mt-3 text-lg font-bold transition-colors group-hover:text-accent">&larr; {previous.title}</p>
          </Link>
          <Link href={`/ko/portfolio/${next.slug}`} className="group bg-surface p-6 text-right transition-colors hover:bg-white md:p-8">
            <span className="font-sans text-[10px] font-bold tracking-[0.12em] text-gray-400">다음 프로젝트</span>
            <p className="mt-3 text-lg font-bold transition-colors group-hover:text-accent">{next.title} &rarr;</p>
          </Link>
        </nav>
      </article>
    </main>
  );
}

function CaseSection({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-7 space-y-2">
        <p className="font-sans text-[10px] font-bold tracking-[0.16em] text-gray-400">
          {label}
        </p>
        <h2 className="break-keep text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
