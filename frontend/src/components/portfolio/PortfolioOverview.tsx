import KoreanProjectCard from "@/components/portfolio/KoreanProjectCard";
import PortfolioClosingCta from "@/components/portfolio/PortfolioClosingCta";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import ProjectCard from "@/components/portfolio/ProjectCard";
import SelectedEvidenceHighlights from "@/components/portfolio/SelectedEvidenceHighlights";
import Reveal from "@/components/motion/Reveal";
import { koreanPortfolioProjects } from "@/data/portfolio.ko";
import { portfolioProjects } from "@/data/portfolio";
import { portfolioCapabilities } from "@/data/portfolioCapabilities";
import {
  getPortfolioBasePath,
  type PortfolioLocale,
  type PortfolioMode,
} from "@/data/portfolioRouting";

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
    <main lang={isKorean ? "ko" : "en"} className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-ink-body sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <PortfolioHero locale={locale} mode={mode} />

        <section className="space-y-10">
          <Reveal className="grid gap-6 md:grid-cols-12 md:items-end" y={16}>
            <div className="space-y-4 md:col-span-7">
              <p className="eyebrow text-slate">
                {isKorean ? "제가 일하는 방식" : "How I work"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
                {isKorean ? "숫자를 정리한 뒤, 그 숫자로 무엇을 말할 수 있는지까지 봅니다." : "I try to make the numbers useful before I make them impressive."}
              </h2>
            </div>
            <p className="break-keep text-sm leading-relaxed text-slate md:col-span-5">
              {isKorean
                ? "먼저 왜 이 질문을 봐야 하는지 정리하고, 확인한 사실과 아직 가정으로 남겨야 할 부분을 나눠서 보고서와 화면으로 옮깁니다."
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
              <p className="eyebrow text-slate">
                {isKorean ? "주요 프로젝트" : "Selected work"}
              </p>
              <h2 className="break-keep font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
                {isKorean ? "지금 자세히 설명할 수 있는 일곱 가지 작업입니다." : "Seven projects I can walk through in detail."}
              </h2>
            </div>
            <p className="max-w-md break-keep text-sm leading-relaxed text-muted">
              {isKorean
                ? "각 프로젝트에는 왜 시작했는지, 무엇을 확인했는지, 결론을 어디까지 말할 수 있는지를 같이 적었습니다."
                : "Each project explains why I started it, what I checked, and where the conclusion should stop."}
            </p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, i) =>
              isKorean ? (
                <Reveal key={project.slug} delay={i * 0.06} y={16} className="h-full">
                  <KoreanProjectCard project={project} basePath={basePath} />
                </Reveal>
              ) : (
                <Reveal key={project.slug} delay={i * 0.06} y={16} className="h-full">
                  <ProjectCard project={project} basePath={basePath} />
                </Reveal>
              ),
            )}
          </div>
        </section>

        <PortfolioClosingCta locale={locale} mode={mode} />
      </div>
    </main>
  );
}
