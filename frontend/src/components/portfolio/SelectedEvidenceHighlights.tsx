import { featuredPortfolioSlugs } from "@/data/portfolioCuration";
import { portfolioEvidenceHighlights, type EvidenceLocale } from "@/data/portfolioEvidence";

export default function SelectedEvidenceHighlights({
  locale,
}: {
  locale: EvidenceLocale;
}) {
  // Only the featured projects' numbers, in the featured order.
  const highlights = featuredPortfolioSlugs.flatMap(
    (slug) => portfolioEvidenceHighlights.find((item) => item.slug === slug) ?? [],
  );

  return (
    <section className="space-y-9" aria-labelledby={`selected-evidence-${locale}`}>
      <div className="grid gap-5 md:grid-cols-12 md:items-end">
        <div className="space-y-4 md:col-span-7">
          <p className={`text-[11px] font-semibold text-slate ${locale === "ko" ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
            {locale === "ko" ? "대표 근거" : "Selected evidence highlights"}
          </p>
          <h2 id={`selected-evidence-${locale}`} className="break-keep font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {locale === "ko"
              ? "대표 프로젝트의 숫자만 먼저 보여줍니다."
              : "The featured projects' numbers come first."}
          </h2>
        </div>
        <p className="break-keep text-sm leading-relaxed text-slate md:col-span-5">
          {locale === "ko"
            ? "채용 담당자가 먼저 볼 세 가지 사례만 남겼습니다. 북극항로처럼 면접에서 깊게 방어하기 어려운 작업은 아래 Explore 영역으로 낮춰 배치했습니다."
            : "Only the three cases a recruiter should see first are kept here. Work that is harder to defend in depth in an interview, like the Arctic route study, sits lower in the Explore section below."}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
        {highlights.map((item) => (
          <article key={item.slug} className="bg-surface p-6 md:p-8">
            <p className={`text-[11px] font-semibold text-slate ${locale === "ko" ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
              {locale === "ko" ? "근거" : "Evidence"}
            </p>
            <h3 className="mt-3 font-serif text-xl font-semibold tracking-tight text-accent md:text-2xl">
              {item.evidence[locale]}
            </h3>
            <p className="mt-5 break-keep text-sm leading-relaxed text-ink-body">
              <span className="font-semibold text-ink">
                {locale === "ko" ? "다룬 일 · " : "What I worked on · "}
              </span>
              {item.demonstrates[locale]}
            </p>
            <p className="mt-3 break-keep border-l-2 border-brick/30 pl-3 text-xs leading-relaxed text-slate">
              <span className="font-semibold text-slate">
                {locale === "ko" ? "주의할 점 · " : "Caveat · "}
              </span>
              {item.caution[locale]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
