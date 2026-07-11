import Link from "next/link";
import type { PortfolioProject } from "@/data/portfolio";
import { portfolioCardChips } from "@/data/portfolioEvidence";

export default function ProjectCard({
  project,
  basePath = "/portfolio",
}: {
  project: PortfolioProject;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/${project.slug}`}
      className="group flex h-full flex-col justify-between card-hair p-6 md:p-8 transition-all hover:-translate-y-1"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 font-sans">
          <span className="eyebrow text-accent">
            {project.number}
          </span>
          <span className="eyebrow text-right text-slate">
            {project.category}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="font-serif text-2xl font-bold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent">
            {project.title}
          </h3>
        </div>

        <div className="border-l-2 border-accent/25 pl-4">
          <p className="eyebrow text-slate">
            Business question
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-ink-body">
            {project.question}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(portfolioCardChips[project.slug] ?? []).map((chip) => (
            <span key={chip.en} className="bg-surface-muted px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate">
              {chip.en}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end border-t border-border-light pt-5">
        <span className="eyebrow text-accent">
          View case study &rarr;
        </span>
      </div>
    </Link>
  );
}
