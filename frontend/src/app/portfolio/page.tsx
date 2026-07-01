import type { Metadata } from "next";
import PortfolioClosingCta from "@/components/portfolio/PortfolioClosingCta";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import ProjectCard from "@/components/portfolio/ProjectCard";
import SelectedEvidenceHighlights from "@/components/portfolio/SelectedEvidenceHighlights";
import { portfolioProjects } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
  alternates: {
    canonical: "/portfolio",
    languages: { en: "/portfolio", ko: "/ko/portfolio" },
  },
};

const capabilities = [
  { title: "Economics & Markets", body: "International trade, macroeconomic context, alternative data, and market research." },
  { title: "Business & Finance", body: "Customer strategy, financial statements, corporate valuation, and industry analysis." },
  { title: "Data & Research", body: "Python, statistics, regression, classification, explainable AI, and survey analysis." },
  { title: "Execution & Communication", body: "Dashboards, analytical reports, MVPs, operating workflows, and decision recommendations." },
];

export default function PortfolioPage() {
  return (
    <main className="portfolio-ui min-h-screen bg-surface px-4 py-10 font-sans text-[#222] sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <PortfolioHero locale="en" />

        <section className="space-y-10">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400">Capability summary</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Business context, tested through evidence.</h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 md:col-span-5">
              My work begins with a decision question, selects evidence appropriate to that question, and finishes by separating supported findings from assumptions and next validation steps.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden border border-black/5 bg-black/5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <article key={capability.title} className="space-y-3 bg-[#FAF9F6] p-6 md:p-7">
                <h3 className="text-lg font-bold text-accent">{capability.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <SelectedEvidenceHighlights locale="en" />

        <section className="space-y-10" id="cases">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400">Selected work</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Seven evidence-led case studies.</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-gray-500">
              Each case follows the same path: question, evidence, analysis, interpretation, and practical decision value.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}
          </div>
        </section>

        <PortfolioClosingCta locale="en" />
      </div>
    </main>
  );
}
