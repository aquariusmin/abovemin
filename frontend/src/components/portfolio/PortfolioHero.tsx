import Link from "next/link";
import type { EvidenceLocale } from "@/data/portfolioEvidence";
import {
  getPortfolioBasePath,
  getPortfolioPrintPath,
  type PortfolioMode,
} from "@/data/portfolioRouting";

export default function PortfolioHero({
  locale,
  mode = "normal",
}: {
  locale: EvidenceLocale;
  mode?: PortfolioMode;
}) {
  const isKorean = locale === "ko";
  const alternateLocale = isKorean ? "en" : "ko";

  return (
    <header className="grid gap-10 border-b border-hairline pb-14 md:grid-cols-12 md:items-end md:pb-20">
      <div className="space-y-7 md:col-span-8">
        <p className="eyebrow text-slate">
          {isKorean ? "Professional Portfolio · 이상민" : "Professional Portfolio · Sangmin Lee"}
        </p>
        <div className="space-y-5">
          <h1 className="max-w-5xl break-keep font-serif text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
            {isKorean
              ? "데이터로 비즈니스 문제를 분석하고, 실제 의사결정에 쓸 수 있는 결론으로 연결합니다."
              : "Turning ambiguous questions into practical, evidence-led decisions."}
          </h1>
          <p className="max-w-3xl break-keep text-base font-semibold leading-relaxed text-accent md:text-xl">
            {isKorean
              ? "광운대학교 국제통상학부를 전공하고 경영학을 복수전공하며, 데이터 분석·금융·전략 분야의 실무를 준비하고 있습니다."
              : "Economics and business student turning data, financial research, and service thinking into practical decisions."}
          </p>
          <p className="max-w-3xl break-keep text-sm leading-relaxed text-gray-600 md:text-base">
            {isKorean
              ? "고객 이탈 분석, 야간 위성 조도 기반 GDP 분석, 기업 재무분석, 모의투자 시스템, 서비스 MVP 기획을 진행했습니다. 각 프로젝트에서는 결과가 말해 주는 범위와 추가 검증이 필요한 지점을 구분해 정리했습니다."
              : "As an International Trade major and Business Administration double-major candidate, I have worked across customer analytics, alternative-data economics, corporate valuation, fintech systems, and service MVP planning. I separate what the evidence supports from what still requires validation."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="#cases" className="btn-primary">
            {isKorean ? "프로젝트 보기" : "View case studies"}
          </Link>
          <Link href={getPortfolioBasePath(alternateLocale, mode)} hrefLang={alternateLocale} className="btn-outline">
            {isKorean ? "English" : "한국어"}
          </Link>
          <Link href={getPortfolioPrintPath(locale, mode)} className="btn-outline">
            {isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"}
          </Link>
        </div>
      </div>

      <div className="space-y-5 md:col-span-4 md:border-l md:border-hairline md:pl-8">
        <p className={`text-[11px] font-semibold text-slate ${isKorean ? "tracking-[0.14em]" : "font-mono uppercase tracking-[0.2em]"}`}>
          {isKorean ? "문제 해결 흐름" : "Working method"}
        </p>
        <ol className="space-y-3 text-sm text-gray-700">
          {(isKorean
            ? ["비즈니스·연구 질문", "근거와 데이터", "분석", "해석", "실무적 의사결정"]
            : ["Business question", "Evidence", "Analysis", "Interpretation", "Practical decision"]
          ).map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="w-5 font-mono text-[10px] text-accent">{String(index + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </header>
  );
}
