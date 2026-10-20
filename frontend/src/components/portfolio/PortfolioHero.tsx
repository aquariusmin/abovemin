import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import type { EvidenceLocale } from "@/data/portfolioEvidence";
import {
  getPortfolioBasePath,
  getPortfolioPrintPath,
  type PortfolioRoute,
} from "@/data/portfolioRouting";

// The copy is the same on both URL families; `route` only picks which family
// the links stay in — see `portfolioRouting.ts`.
export default function PortfolioHero({
  locale,
  route,
}: {
  locale: EvidenceLocale;
  route: PortfolioRoute;
}) {
  const isKorean = locale === "ko";
  const alternateLocale = isKorean ? "en" : "ko";

  return (
    <Reveal as="header" className="grid gap-10 border-b border-hairline pb-14 md:grid-cols-12 md:items-end md:pb-20" y={16}>
      <div className="space-y-7 md:col-span-8">
        <p className={`eyebrow-marked text-primary ${isKorean ? 'label-ko' : 'eyebrow'}`}>
          {isKorean ? "포트폴리오 · 이상민" : "Portfolio · Sangmin Lee"}
        </p>
        <div className="space-y-5">
          {/* Fluid rather than three fixed steps. `md:text-7xl` fired at 768px, a
              size tuned for a 1400px column: on a tablet this headline went
              from three lines to six, ~460px tall, and pushed the CTA row off
              screen. The clamp reaches the same 4.5rem at desktop but passes
              through ~46px at 768px instead of jumping to 72. Every other page
              tops out at `md:text-6xl`; this was the one outlier. */}
          <h1 className="max-w-5xl break-keep font-serif text-[clamp(2.25rem,5vw+0.5rem,4.5rem)] font-medium leading-[1.05] tracking-tight text-ink">
            {isKorean
              ? "데이터로 궁금한 것을 확인하고, 결과를 이해하기 쉽게 정리합니다."
              : "I test the assumptions behind data and turn it into metrics a decision can rest on."}
          </h1>
          <p className="max-w-3xl break-keep text-base font-medium leading-relaxed text-accent md:text-xl">
            {isKorean
              ? "국제통상과 경영을 공부한 이상민입니다. 공공데이터와 고객 데이터, 경제지표를 다루며 관심 있는 주제를 직접 분석해 왔습니다. 분석 과정에서 예상과 다른 결과가 나오면 데이터와 계산 방법부터 다시 살펴봅니다."
              : "With a background in international trade and business, I analyse public data, customer data, and alternative economic indicators. I care less about producing a good number than about checking how far that number can speak."}
          </p>
          <p className="max-w-3xl break-keep text-sm leading-relaxed text-slate md:text-base">
            {isKorean
              ? "부산 도시철도 이용객의 체류시간 추정, 통신 고객 이탈 분석, 야간조도와 GDP의 관계를 살펴본 프로젝트를 소개합니다. 북극항로 분석 등 다른 작업도 아래에 함께 정리했습니다."
              : "The three featured projects are the Busan urban-rail dwell analysis, telecom churn XAI, and satellite night-light GDP analysis. Work that explored an unfamiliar domain with AI help, like the Arctic route study, is set apart in Explore with less weight."}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate">
            <a className="link-underline transition-colors hover:text-accent" href="mailto:aquariusmin01@naver.com">
              aquariusmin01@naver.com
            </a>
            <a className="link-underline transition-colors hover:text-accent" href="https://github.com/aquariusmin" target="_blank" rel="noopener noreferrer">
              github.com/aquariusmin
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="#cases" className="btn-primary">
            {isKorean ? "프로젝트 보기" : "View case studies"}
          </Link>
          <Link href={getPortfolioBasePath(alternateLocale, route)} hrefLang={alternateLocale} className="btn-outline">
            {isKorean ? "English" : "한국어"}
          </Link>
          <Link
            href={getPortfolioPrintPath(locale, route)}
            className="link-underline inline-flex items-center py-2 text-sm text-slate"
          >
            {isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"}
          </Link>
        </div>
      </div>

      <div className="space-y-5 md:col-span-4 md:border-l md:border-hairline md:pl-8">
        <p className={isKorean ? "label-ko text-slate" : "eyebrow text-slate"}>
          {isKorean ? "분석 순서" : "Working method"}
        </p>
        <ol className="space-y-3 text-sm text-slate">
          {(isKorean
            ? ["문제 정의", "데이터 가정 확인", "지표·모델 설계", "검증과 수정", "해석 범위"]
            : ["Define the problem", "Check the data's assumptions", "Design the metric / model", "Validate and revise", "Scope the reading"]
          ).map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <span className="w-5 font-mono text-[10px] text-primary">{String(index + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
