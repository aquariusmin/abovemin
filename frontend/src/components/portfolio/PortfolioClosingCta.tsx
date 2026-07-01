import Link from "next/link";
import type { EvidenceLocale } from "@/data/portfolioEvidence";

export default function PortfolioClosingCta({ locale }: { locale: EvidenceLocale }) {
  const isKorean = locale === "ko";

  return (
    <section className="grid gap-8 border-y border-black/5 py-12 md:grid-cols-12 md:items-center md:py-16">
      <div className="space-y-4 md:col-span-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
          {isKorean ? "다음 대화" : "Continue the conversation"}
        </p>
        <h2 className="break-keep text-3xl font-bold tracking-tight md:text-4xl">
          {isKorean ? "데이터와 비즈니스 맥락을 함께 읽는 역할을 찾고 있습니다." : "Looking for roles where evidence and business context belong together."}
        </h2>
        <p className="max-w-2xl break-keep text-sm leading-relaxed text-gray-600">
          {isKorean
            ? "데이터 분석, 금융·시장 리서치, 핀테크, 전략·BizOps, 서비스 기획 직무의 인턴십 및 신입 기회를 탐색하고 있습니다."
            : "Open to internship and entry-level opportunities across data analysis, financial and market research, fintech, strategy, BizOps, and service planning."}
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 text-sm font-semibold md:col-span-5 md:items-end">
        <a className="text-accent hover:underline" href="mailto:aquariusmin01@naver.com">aquariusmin01@naver.com</a>
        <a className="text-accent hover:underline" href="https://github.com/aquariusmin" target="_blank" rel="noopener noreferrer">github.com/aquariusmin</a>
        <Link className="text-accent hover:underline" href="/about">{isKorean ? "소개 더 보기" : "More about me"} &rarr;</Link>
        <Link className="text-accent hover:underline" href={isKorean ? "/ko/portfolio/print" : "/portfolio/print"}>{isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"} &rarr;</Link>
      </div>
    </section>
  );
}
