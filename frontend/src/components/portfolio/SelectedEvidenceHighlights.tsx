import { portfolioEvidenceHighlights, type EvidenceLocale } from "@/data/portfolioEvidence";

export default function SelectedEvidenceHighlights({ locale }: { locale: EvidenceLocale }) {
  return (
    <section className="space-y-9" aria-labelledby={`selected-evidence-${locale}`}>
      <div className="grid gap-5 md:grid-cols-12 md:items-end">
        <div className="space-y-4 md:col-span-7">
          <p className={`text-[11px] font-semibold text-slate ${locale === "ko" ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
            {locale === "ko" ? "대표 근거" : "Selected evidence highlights"}
          </p>
          <h2 id={`selected-evidence-${locale}`} className="break-keep font-serif text-3xl font-bold tracking-tight md:text-4xl">
            {locale === "ko" ? "숫자는 보여주고, 해석 범위는 같이 둡니다." : "Key numbers, with the caveats kept close."}
          </h2>
        </div>
        <p className="break-keep text-sm leading-relaxed text-slate md:col-span-5">
          {locale === "ko"
            ? "눈에 띄는 수치일수록 어디서 나온 값인지, 아직 말할 수 없는 부분은 무엇인지 같이 붙였습니다. 자세한 과정은 아래 프로젝트별 사례에 나눠 적었습니다."
            : "When a number could sound like an outcome claim, I spell out where it came from and what it does not prove. The full cases below carry the detail."}
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
            <p className="mt-5 break-keep text-sm leading-relaxed text-ink-body">
              <span className="font-bold text-ink">
                {locale === "ko" ? "다룬 일 · " : "What I worked on · "}
              </span>
              {item.demonstrates[locale]}
            </p>
            <p className="mt-3 break-keep border-l-2 border-amber-700/20 pl-3 text-xs leading-relaxed text-slate">
              <span className="font-bold text-slate">
                {locale === "ko" ? "주의할 점 · " : "Caveat · "}
              </span>
              {item.caution[locale]}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
