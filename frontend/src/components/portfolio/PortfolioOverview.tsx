import PortfolioClosingCta from "@/components/portfolio/PortfolioClosingCta";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import PortfolioJsonLd from "@/components/portfolio/PortfolioJsonLd";
import ProjectCard from "@/components/portfolio/ProjectCard";
import SelectedEvidenceHighlights from "@/components/portfolio/SelectedEvidenceHighlights";
import Reveal from "@/components/motion/Reveal";
import { getPortfolio } from "@/data/portfolioAccess";
import { portfolioCapabilities } from "@/data/portfolioCapabilities";
import {
  getPortfolioBasePath,
  type PortfolioLocale,
  type PortfolioRoute,
} from "@/data/portfolioRouting";

export default function PortfolioOverview({
  locale,
  route,
}: {
  locale: PortfolioLocale;
  /** Which URL family the cards and links point into — the page itself is the
   *  same on both. See `portfolioRouting.ts`. */
  route: PortfolioRoute;
}) {
  const isKorean = locale === "ko";
  const { featured: featuredProjects, archive: archiveProjects } = getPortfolio(locale);
  const basePath = getPortfolioBasePath(locale, route);

  return (
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-ink-body sm:px-6 md:px-10 md:py-16">
      {/* Only on the indexable route — see the component's own note. */}
      {route === "normal" && (
        <PortfolioJsonLd
          locale={locale}
          projects={[...featuredProjects, ...archiveProjects]}
          basePath={basePath}
        />
      )}

      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <PortfolioHero locale={locale} route={route} />

        <section className="space-y-10">
          <Reveal className="grid gap-6 md:grid-cols-12 md:items-end" y={16}>
            <div className="space-y-4 md:col-span-7">
              <p className={isKorean ? "label-ko text-slate" : "eyebrow text-slate"}>
                {isKorean ? "관심 분야와 작업 방식" : "How I work"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
                {isKorean ? "궁금한 점에서 시작해 데이터를 찾아봅니다." : "I try to make the numbers useful before I make them impressive."}
              </h2>
            </div>
            <p className="break-keep text-sm leading-relaxed text-slate md:col-span-5">
              {isKorean
                ? "질문에 맞는 자료를 찾고, 분석 방법을 정한 뒤 결과를 보고서나 대시보드로 정리합니다. 자료가 부족하거나 추가 확인이 필요한 부분도 함께 적습니다."
                : "I start by asking why the question matters, then separate what I checked from what still needs another pass."}
            </p>
          </Reveal>
          <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
            {portfolioCapabilities[locale].map((capability, i) => (
              <Reveal
                as="article"
                key={capability.title}
                delay={i * 0.06}
                y={16}
                className="group space-y-3 bg-surface p-6 transition-colors duration-300 hover:bg-surface-muted md:p-7"
              >
                <h3 className="font-serif text-lg font-medium text-accent">{capability.title}</h3>
                <p className="break-keep text-sm leading-relaxed text-slate">{capability.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <SelectedEvidenceHighlights locale={locale} />

        <section className="space-y-10" id="cases">
          <Reveal className="flex flex-col justify-between gap-5 md:flex-row md:items-end" y={16}>
            <div className="space-y-4">
              <p className={isKorean ? "label-ko text-slate" : "eyebrow text-slate"}>
                {isKorean ? "주요 프로젝트" : "Selected work"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
                {isKorean
                  ? "주요 프로젝트 세 가지"
                  : "Three featured projects come first."}
              </h2>
            </div>
            <p className="max-w-md break-keep text-sm leading-relaxed text-muted-foreground">
              {isKorean
                ? "각 프로젝트에 사용한 데이터와 분석 과정, 주요 결과를 담았습니다. 진행 중 겪었던 문제와 수정한 내용도 상세 페이지에서 볼 수 있습니다."
                : "This first screen leads with analysis I can defend myself. Each case shows the question, how the data was checked, and how far the conclusion reaches."}
            </p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredProjects.map((project, i) => (
              <Reveal key={project.slug} delay={i * 0.06} y={16} className="h-full">
                <ProjectCard project={project} locale={locale} basePath={basePath} />
              </Reveal>
            ))}
          </div>
        </section>

        {archiveProjects.length > 0 && (
          <section className="space-y-8" aria-labelledby="submission-archive">
            <Reveal className="grid gap-5 border-t border-hairline pt-10 md:grid-cols-12 md:items-end" y={16}>
              <div className="space-y-3 md:col-span-7">
                <p className={isKorean ? "label-ko text-slate" : "eyebrow text-slate"}>Explore / Archive</p>
                <h2 id="submission-archive" className="break-keep font-serif text-2xl font-medium tracking-tight text-ink md:text-3xl">
                  {isKorean
                    ? "함께 진행한 작업들"
                    : "Unfamiliar domains and side projects carry less weight."}
                </h2>
              </div>
              <p className="break-keep text-sm leading-relaxed text-slate md:col-span-5">
                {isKorean
                  ? "수업 과제부터 자동매매 시스템, 사진 굿즈 제작까지 관심을 따라 진행한 작업입니다. 북극항로 분석은 AI의 도움을 받아 GIS와 기후 데이터를 공부하며 시도했습니다."
                  : "The Arctic route study was extended with AI help as exploratory work, so it is left out of the featured set. It stays here as supporting material that still shows habits of reproducibility, stated limits, and building systems."}
              </p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {archiveProjects.map((project, i) => (
                <Reveal key={project.slug} delay={i * 0.04} y={16} className="h-full">
                  <ProjectCard project={project} locale={locale} basePath={basePath} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <PortfolioClosingCta locale={locale} route={route} />
      </div>
    </main>
  );
}
