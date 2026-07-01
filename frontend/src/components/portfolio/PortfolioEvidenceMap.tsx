import Link from "next/link";
import {
  evidenceStatusLabels,
  portfolioEvidenceOverview,
  type EvidenceLocale,
} from "@/data/portfolioEvidence";

export default function PortfolioEvidenceMap({ locale }: { locale: EvidenceLocale }) {
  const basePath = locale === "ko" ? "/ko/portfolio" : "/portfolio";

  return (
    <section className="space-y-9" aria-labelledby={`evidence-map-${locale}`}>
      <div className="grid gap-5 md:grid-cols-12 md:items-end">
        <div className="space-y-4 md:col-span-7">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-gray-400">
            {locale === "ko" ? "근거 지도" : "Evidence map"}
          </p>
          <h2 id={`evidence-map-${locale}`} className="break-keep text-3xl font-bold tracking-tight md:text-4xl">
            {locale === "ko"
              ? "확인된 근거와 아직 필요한 검증을 함께 보여줍니다."
              : "Verified evidence, with the gaps left visible."}
          </h2>
        </div>
        <p className="break-keep font-sans text-sm leading-relaxed text-gray-500 md:col-span-5">
          {locale === "ko"
            ? "원자료, 보고서 결과, 구현 코드와 pending 항목을 구분했습니다. pending 표시는 시각 자료를 꾸미기 위해 임의의 값을 채우지 않았다는 뜻입니다."
            : "Each case distinguishes source-backed data, reported outputs, implemented systems, and pending validation. Pending means no decorative substitute was invented."}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden border border-black/5 bg-black/5 md:grid-cols-2 xl:grid-cols-3">
        {portfolioEvidenceOverview.map((item) => (
          <Link
            key={item.slug}
            href={`${basePath}/${item.slug}#evidence`}
            className="group flex min-h-56 flex-col justify-between bg-[#FAF9F6] p-6 transition-colors hover:bg-white md:p-7"
          >
            <div className="space-y-4">
              <span className="inline-block border border-accent/15 bg-accent/[0.05] px-2.5 py-1 font-sans text-[9px] font-bold uppercase tracking-[0.13em] text-accent">
                {evidenceStatusLabels[item.status][locale]}
              </span>
              <h3 className="text-xl font-bold leading-tight tracking-tight transition-colors group-hover:text-accent">
                {item.title}
              </h3>
              <p className="break-keep font-sans text-sm leading-relaxed text-gray-600">
                {item.summary[locale]}
              </p>
            </div>
            <span className="mt-6 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              {locale === "ko" ? "근거 보기" : "View evidence"} &rarr;
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
