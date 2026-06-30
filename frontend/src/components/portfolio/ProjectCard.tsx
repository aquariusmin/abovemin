import Link from "next/link";
import type { PortfolioProject } from "@/data/portfolio";

export default function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group flex h-full flex-col justify-between border border-black/5 bg-white/55 p-6 md:p-8 transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_20px_60px_-30px_rgba(74,93,78,0.35)]"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 font-sans">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            {project.number}
          </span>
          <span className="text-right text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            {project.category}
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-[#222] transition-colors group-hover:text-accent">
            {project.title}
          </h2>
          <p className="font-sans text-sm leading-relaxed text-gray-600">
            {project.summary}
          </p>
        </div>

        <div className="border-l-2 border-accent/25 pl-4">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Business question
          </p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-[#333]">
            {project.question}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-5 font-sans">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
          {project.period}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          Read case &rarr;
        </span>
      </div>
    </Link>
  );
}
