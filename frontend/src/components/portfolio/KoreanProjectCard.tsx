import Link from "next/link";
import type { PortfolioProject } from "@/data/portfolio";
import { portfolioCardChips } from "@/data/portfolioEvidence";

export default function KoreanProjectCard({
  project,
  basePath = "/ko/portfolio",
}: {
  project: PortfolioProject;
  basePath?: string;
}) {
  return (
    <Link
      href={`${basePath}/${project.slug}`}
      className="group flex h-full flex-col justify-between border border-black/5 bg-white/55 p-6 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_20px_60px_-30px_rgba(74,93,78,0.35)] md:p-8"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 font-sans">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            {project.number}
          </span>
          <span className="text-right text-[10px] font-semibold tracking-[0.08em] text-gray-400">
            {project.category}
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#222] transition-colors group-hover:text-accent">
            {project.title}
          </h2>
        </div>

        <div className="border-l-2 border-accent/25 pl-4">
          <p className="font-sans text-[10px] font-bold tracking-[0.12em] text-gray-400">
            비즈니스·연구 질문
          </p>
          <p className="mt-2 break-keep font-sans text-sm leading-relaxed text-[#333]">
            {project.question}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {portfolioCardChips[project.slug].map((chip) => (
            <span key={chip.en} className="bg-surface-muted px-2.5 py-1.5 text-[9px] font-bold tracking-[0.05em] text-gray-600">
              {chip.ko}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end border-t border-black/5 pt-5">
        <span className="text-[10px] font-bold tracking-[0.12em] text-accent">
          사례 자세히 보기 &rarr;
        </span>
      </div>
    </Link>
  );
}
