import Link from "next/link";
import type { EvidenceLocale } from "@/data/portfolioEvidence";
import { getPortfolioPrintPath, type PortfolioMode } from "@/data/portfolioRouting";

export default function PortfolioClosingCta({
  locale,
  mode = "normal",
}: {
  locale: EvidenceLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";

  return (
    // Cream card rather than a rule-bounded row: the closing ask gets the one
    // tonal shift in an otherwise white case-study page.
    <section className="card-cream my-12 grid gap-8 px-6 py-10 md:my-16 md:grid-cols-12 md:items-center md:px-12 md:py-14">
      <div className="space-y-4 md:col-span-7">
        <p className={`text-[11px] text-forest ${isKorean ? "font-semibold tracking-[0.14em]" : "font-mono font-medium uppercase tracking-[0.2em]"}`}>
          {isKorean ? "연락" : "Continue the conversation"}
        </p>
        <h2 className="break-keep font-serif text-3xl font-semibold tracking-tight text-forest-deep md:text-4xl">
          {isKorean ? "숫자를 읽고, 바로 써먹을 수 있는 판단으로 옮기는 일을 하고 싶습니다." : "I want to work where numbers have to become clear next steps."}
        </h2>
        <p className="max-w-2xl break-keep text-sm leading-relaxed text-secondary-foreground/80">
          {isKorean
            ? "데이터 분석, 금융·시장 리서치, 핀테크, 전략·BizOps, 서비스 기획과 가까운 인턴십 및 신입 기회를 탐색하고 있습니다."
            : "Open to internship and entry-level roles near data analysis, financial and market research, fintech, strategy, BizOps, and service planning."}
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 text-sm font-semibold md:col-span-5 md:items-end">
        <a className="link-underline text-forest hover:text-fern" href="mailto:aquariusmin01@naver.com">aquariusmin01@naver.com</a>
        <a className="link-underline text-forest hover:text-fern" href="https://github.com/aquariusmin" target="_blank" rel="noopener noreferrer">github.com/aquariusmin</a>
        {mode === "normal" && (
          <Link className="link-underline text-forest hover:text-fern" href="/about">{isKorean ? "소개 더 보기" : "More about me"} &rarr;</Link>
        )}
        <Link className="link-underline text-forest hover:text-fern" href={getPortfolioPrintPath(locale, mode)}>{isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"} &rarr;</Link>
      </div>
    </section>
  );
}
