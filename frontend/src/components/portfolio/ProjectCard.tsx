import Link from "next/link";
import type { PortfolioProject } from "@/data/portfolio";
import { portfolioCardChips } from "@/data/portfolioEvidence";
import { getPortfolioBasePath, type PortfolioLocale } from "@/data/portfolioRouting";

// One card, two typographic treatments. English labels use `.eyebrow` and
// `.chip` — mono, uppercase, wide tracking. That treatment scatters Hangul, so
// the Korean card spells its small labels out in sans with a tighter tracking
// instead. The difference is deliberate; keep it keyed to the locale.
const styles = {
  en: {
    link: "group flex h-full flex-col justify-between card-hair p-6 md:p-8 hover:-translate-y-1",
    category: "eyebrow text-right text-slate",
    title: "font-serif text-2xl font-medium leading-tight tracking-tight text-ink transition-colors group-hover:text-accent",
    questionBlock: "border-l-2 border-hairline pl-4 transition-colors group-hover:border-accent",
    questionLabel: "eyebrow text-slate",
    question: "mt-2 font-sans text-sm leading-relaxed text-ink-body",
    chip: "chip",
    footer: "mt-8 flex items-center justify-end border-t border-hairline pt-5",
    cta: "eyebrow text-accent",
  },
  ko: {
    link: "group flex h-full flex-col justify-between card-hair p-6 transition-all hover:-translate-y-1 md:p-8",
    category: "text-right text-[11px] font-semibold tracking-[0.14em] text-slate",
    title: "font-serif text-2xl font-semibold leading-tight tracking-tight text-ink transition-colors group-hover:text-accent",
    questionBlock: "border-l-2 border-accent/25 pl-4",
    questionLabel: "font-sans text-[11px] font-semibold tracking-[0.14em] text-slate",
    question: "mt-2 break-keep font-sans text-sm leading-relaxed text-ink-body",
    chip: "bg-surface-muted px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.05em] text-slate",
    footer: "mt-8 flex items-center justify-end border-t border-border-light pt-5",
    cta: "text-[11px] font-semibold tracking-[0.14em] text-accent",
  },
} as const;

const labels = {
  en: { question: "Business question", cta: "View case study →" },
  ko: { question: "비즈니스·연구 질문", cta: "사례 자세히 보기 →" },
} as const;

export default function ProjectCard({
  project,
  locale,
  basePath = getPortfolioBasePath(locale, "normal"),
}: {
  project: PortfolioProject;
  locale: PortfolioLocale;
  basePath?: string;
}) {
  const style = styles[locale];
  const copy = labels[locale];

  return (
    <Link href={`${basePath}/${project.slug}`} className={style.link}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-6 font-sans">
          <span className="eyebrow text-accent">
            {project.number}
          </span>
          <span className={style.category}>
            {project.category}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className={style.title}>
            {project.title}
          </h3>
        </div>

        <div className={style.questionBlock}>
          <p className={style.questionLabel}>
            {copy.question}
          </p>
          <p className={style.question}>
            {project.question}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(portfolioCardChips[project.slug] ?? []).map((chip) => (
            <span key={chip.en} className={style.chip}>
              {chip[locale]}
            </span>
          ))}
        </div>
      </div>

      <div className={style.footer}>
        <span className={style.cta}>
          {copy.cta}
        </span>
      </div>
    </Link>
  );
}
