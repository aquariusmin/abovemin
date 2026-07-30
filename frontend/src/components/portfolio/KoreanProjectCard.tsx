import Link from "next/link";
import type { PortfolioProject } from "@/data/portfolio";
import { portfolioCardChips } from "@/data/portfolioEvidence";

export default function KoreanProjectCard({
  project,
  basePath = "/portfolio",
}: {
  project: PortfolioProject;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/${project.slug}`}
      className="group flex h-full flex-col justify-between card-hair p-6 transition-all hover:-translate-y-1 md:p-8"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 font-sans">
          <span className="eyebrow text-accent">
            {project.number}
          </span>
          <span className="text-right text-[11px] font-semibold tracking-[0.14em] text-slate">
            {project.category}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="font-serif text-2xl font-bold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent">
            {project.title}
          </h3>
        </div>

        <div className="border-l-2 border-accent/25 pl-4">
          <p className="font-sans text-[11px] font-semibold tracking-[0.14em] text-slate">
            비즈니스·연구 질문
          </p>
          <p className="mt-2 break-keep font-sans text-sm leading-relaxed text-ink-body">
            {project.question}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(portfolioCardChips[project.slug] ?? []).map((chip) => (
            <span key={chip.en} className="bg-surface-muted px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.05em] text-slate">
              {chip.ko}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end border-t border-border-light pt-5">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-accent">
          사례 자세히 보기 &rarr;
        </span>
      </div>
    </Link>
  );
}
