import type { Metadata } from "next";
import Link from "next/link";
import ProjectCard from "@/components/portfolio/ProjectCard";
import { portfolioProjects } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Sangmin Lee's portfolio across data analysis, economics, financial research, fintech, strategy, BizOps, and service planning.",
};

const capabilities = [
  {
    title: "Economics & Markets",
    body: "International trade, macroeconomic context, alternative data, and market research.",
  },
  {
    title: "Business & Finance",
    body: "Customer strategy, financial statements, corporate valuation, and industry analysis.",
  },
  {
    title: "Data & Research",
    body: "Python, statistics, regression, classification, explainable AI, and survey analysis.",
  },
  {
    title: "Execution & Communication",
    body: "Dashboards, analytical reports, MVPs, operating workflows, and decision recommendations.",
  },
];

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10 font-serif text-[#222] sm:px-6 md:px-10 md:py-16">
      <div className="mx-auto max-w-[1400px] space-y-20 md:space-y-28">
        <header className="grid items-end gap-10 border-b border-black/5 pb-14 md:grid-cols-12 md:pb-20">
          <div className="space-y-7 md:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">
                Professional Portfolio · Sangmin Lee
              </p>
              <Link
                href="/ko/portfolio"
                hrefLang="ko"
                className="font-sans text-[10px] font-bold tracking-[0.16em] text-gray-400 transition-colors hover:text-accent"
              >
                한국어
              </Link>
            </div>
            <h1 className="max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-7xl">
              From economic questions to{" "}
              <span className="text-accent">practical decisions.</span>
            </h1>
            <p className="max-w-3xl font-sans text-sm leading-relaxed text-gray-600 md:text-base">
              I combine economics, business, data analysis, and financial research to
              investigate customer, market, financial, and service questions. My work
              emphasizes responsible interpretation: what the evidence supports, what
              remains uncertain, and what should happen next.
            </p>
          </div>

          <div className="space-y-5 font-sans md:col-span-4 md:border-l md:border-black/5 md:pl-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
              Working method
            </p>
            <ol className="space-y-3 text-sm text-gray-700">
              {["Business question", "Evidence", "Analysis", "Interpretation", "Practical decision"].map(
                (step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="w-5 font-mono text-[10px] text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </header>

        <section className="space-y-10">
          <div className="grid gap-6 md:grid-cols-12 md:items-end">
            <div className="space-y-4 md:col-span-7">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400">
                Profile
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Economics and business context, tested through data.
              </h2>
            </div>
            <p className="font-sans text-sm leading-relaxed text-gray-600 md:col-span-5">
              International Trade major and Business Administration double-major candidate
              at Kwangwoon University, expected February 2027. Interested in data analysis,
              financial and market analysis, fintech, strategy, BizOps, and service planning.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden border border-black/5 bg-black/5 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => (
              <article key={capability.title} className="space-y-3 bg-[#FAF9F6] p-6 md:p-7">
                <h3 className="text-lg font-bold text-accent">{capability.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-gray-600">
                  {capability.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-10" id="cases">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400">
                Selected work
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Seven questions, seven evidence-led cases.
              </h2>
            </div>
            <p className="max-w-md font-sans text-sm leading-relaxed text-gray-500">
              Each case separates measured findings from proposed actions, simulated
              outcomes, and remaining validation work.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-y border-black/5 py-12 md:grid-cols-12 md:py-16">
          <div className="space-y-4 md:col-span-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400">
              Public resume snapshot
            </p>
            <h2 className="text-3xl font-bold tracking-tight">At a glance</h2>
          </div>
          <div className="grid gap-8 font-sans md:col-span-8 md:grid-cols-2">
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p className="font-bold text-[#222]">Education</p>
              <p>Kwangwoon University</p>
              <p>International Trade · Business Administration</p>
              <p>Expected February 2027 · GPA 3.79/4.50</p>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-gray-600">
              <p className="font-bold text-[#222]">Connect</p>
              <a className="block text-accent hover:underline" href="mailto:aquariusmin01@naver.com">
                aquariusmin01@naver.com
              </a>
              <a
                className="block text-accent hover:underline"
                href="https://github.com/aquariusmin"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/aquariusmin
              </a>
              <Link className="inline-block text-accent hover:underline" href="/about">
                More about me &rarr;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
