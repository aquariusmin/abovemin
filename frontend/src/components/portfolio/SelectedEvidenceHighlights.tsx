import { portfolioEvidenceHighlights, type EvidenceLocale } from "@/data/portfolioEvidence";

export default function SelectedEvidenceHighlights({ locale }: { locale: EvidenceLocale }) {
  return (
    <section className="space-y-9" aria-labelledby={`selected-evidence-${locale}`}>
      <div className="grid gap-5 md:grid-cols-12 md:items-end">
        <div className="space-y-4 md:col-span-7">
          <p className={`text-[11px] font-semibold text-slate ${locale === "ko" ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
            {locale === "ko" ? "선별 근거 하이라이트" : "Selected evidence highlights"}
          </p>
          <h2 id={`selected-evidence-${locale}`} className="break-keep font-serif text-3xl font-bold tracking-tight md:text-4xl">
            {locale === "ko" ? "근거가 보여주는 역량과 해석의 경계" : "What the evidence demonstrates—and where it stops."}
          </h2>
        </div>
        <p className="break-keep text-sm leading-relaxed text-gray-500 md:col-span-5">
          {locale === "ko"
            ? "대표 근거를 역량과 연결하되, 성과·인과·실거래로 확대 해석할 수 없는 범위를 함께 표시했습니다. 자세한 과정은 아래 프로젝트 사례에서 확인할 수 있습니다."
            : "Each highlight connects source-backed evidence to a capability while keeping scope and validation boundaries visible. Project cards remain the route to the full cases."}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-2">
        {portfolioEvidenceHighlights.map((item) => (
          <article key={item.evidence.en} className="bg-surface p-6 md:p-8">
            <p className={`text-[11px] font-semibold text-slate ${locale === "ko" ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
              {locale === "ko" ? "근거" : "Evidence"}
            </p>
            <h3 className="mt-3 font-serif text-xl font-bold tracking-tight text-accent md:text-2xl">
              {item.evidence[locale]}
            </h3>
            <p className="mt-5 break-keep text-sm leading-relaxed text-gray-700">
              <span className="font-bold text-[#222]">
                {locale === "ko" ? "보여주는 역량 · " : "Demonstrates · "}
              </span>
              {item.demonstrates[locale]}
            </p>
            <p className="mt-3 break-keep border-l-2 border-amber-700/20 pl-3 text-xs leading-relaxed text-gray-500">
              <span className="font-bold text-gray-600">
                {locale === "ko" ? "범위 · " : "Scope · "}
              </span>
              {item.caution[locale]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
