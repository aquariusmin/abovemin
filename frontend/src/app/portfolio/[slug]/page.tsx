import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioProject, portfolioProjects } from "@/data/portfolio";

export function generateStaticParams() {
  return portfolioProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getPortfolioProject(slug);

  if (!project) {
    return { title: "Case Study Not Found" };
  }

  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function PortfolioCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getPortfolioProject(slug);

  if (!project) notFound();

  const currentIndex = portfolioProjects.findIndex((item) => item.slug === slug);
  const previous = portfolioProjects[(currentIndex - 1 + portfolioProjects.length) % portfolioProjects.length];
  const next = portfolioProjects[(currentIndex + 1) % portfolioProjects.length];

  return (
    <main className="min-h-screen bg-surface px-4 py-10 font-serif text-[#222] sm:px-6 md:px-10 md:py-16">
      <article className="mx-auto max-w-5xl">
        <Link
          href="/portfolio"
          className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 transition-colors hover:text-accent"
        >
          &larr; Portfolio
        </Link>

        <header className="mt-10 space-y-8 border-b border-black/5 pb-12 md:mt-14 md:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4 font-sans">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Case {project.number}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              {project.category}
            </span>
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {project.title}
            </h1>
            <p className="max-w-3xl font-sans text-base leading-relaxed text-gray-600 md:text-lg">
              {project.summary}
            </p>
          </div>

          <div className="grid gap-4 border-y border-black/5 py-5 font-sans text-sm text-gray-600 sm:grid-cols-2">
            <p><span className="font-bold text-[#222]">Period</span> · {project.period}</p>
            <p><span className="font-bold text-[#222]">Role</span> · {project.role}</p>
          </div>
        </header>

        <div className="space-y-16 py-14 md:space-y-24 md:py-20">
          <CaseSection label="01 · Business / research question" title="The question">
            <p className="border-l-4 border-accent bg-white/55 px-6 py-7 text-xl font-semibold leading-relaxed md:px-8 md:py-9 md:text-2xl">
              {project.question}
            </p>
          </CaseSection>

          <CaseSection label="02 · Evidence" title="What the analysis used">
            <div className="grid gap-4 md:grid-cols-3">
              {project.evidence.map((item) => (
                <div key={item} className="border border-black/5 bg-white/55 p-5 font-sans text-sm leading-relaxed text-gray-600">
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

          <CaseSection label="03 · Analysis" title="How the work progressed">
            <ol className="divide-y divide-black/5 border-y border-black/5">
              {project.process.map((step, index) => (
                <li key={step.title} className="grid gap-4 py-6 md:grid-cols-12 md:py-8">
                  <span className="font-mono text-xs text-accent md:col-span-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold md:col-span-3">{step.title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-gray-600 md:col-span-8">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </CaseSection>

          <CaseSection label="04 · Interpretation" title="Main insight">
            <div className="grid gap-4 md:grid-cols-2">
              {project.insights.map((insight) => (
                <p key={insight} className="border border-black/5 bg-white/55 p-6 font-sans text-sm leading-relaxed text-gray-700">
                  {insight}
                </p>
              ))}
            </div>
            {project.caution && (
              <div className="mt-5 border border-amber-700/15 bg-amber-50 px-5 py-4 font-sans text-sm leading-relaxed text-amber-900">
                <span className="font-bold">Important boundary:</span> {project.caution}
              </div>
            )}
          </CaseSection>

          <CaseSection label="05 · Practical decision" title="Decision value">
            <p className="max-w-4xl text-2xl font-semibold leading-relaxed text-accent md:text-3xl">
              {project.decisionValue}
            </p>
          </CaseSection>

          <CaseSection label="06 · Validation" title="Limitations and next checks">
            <ul className="grid gap-3 font-sans md:grid-cols-2">
              {project.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 border border-black/5 bg-white/40 p-5 text-sm leading-relaxed text-gray-600">
                  <span className="mt-1 text-accent">—</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </CaseSection>

          <CaseSection label="07 · Visual evidence" title="Visuals to add after verification">
            <div className="grid gap-4 sm:grid-cols-2">
              {project.suggestedVisuals.map((visual) => (
                <div key={visual} className="flex min-h-32 items-end border border-dashed border-accent/30 bg-accent/[0.025] p-5">
                  <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Planned · {visual}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 font-sans text-xs leading-relaxed text-gray-400">
              No project image or chart is shown until a verified, public-safe asset is available.
            </p>
          </CaseSection>
        </div>

        <nav className="grid gap-px border-y border-black/5 bg-black/5 sm:grid-cols-2">
          <Link href={`/portfolio/${previous.slug}`} className="group bg-surface p-6 transition-colors hover:bg-white md:p-8">
            <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Previous case</span>
            <p className="mt-3 text-lg font-bold transition-colors group-hover:text-accent">&larr; {previous.title}</p>
          </Link>
          <Link href={`/portfolio/${next.slug}`} className="group bg-surface p-6 text-right transition-colors hover:bg-white md:p-8">
            <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Next case</span>
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
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
          {label}
        </p>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
