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
              ? "데이터의 가정을 검증하고, 의사결정 가능한 지표로 바꿉니다."
              : "I test the assumptions behind data and turn it into metrics a decision can rest on."}
          </h1>
          <p className="max-w-3xl break-keep text-base font-medium leading-relaxed text-accent md:text-xl">
            {isKorean
              ? "국제통상·경영 배경 위에서 공공데이터, 고객 데이터, 대체 경제지표를 분석합니다. 좋은 숫자를 만드는 것보다 그 숫자가 어디까지 말할 수 있는지 확인하는 데 집중합니다."
              : "With a background in international trade and business, I analyse public data, customer data, and alternative economic indicators. I care less about producing a good number than about checking how far that number can speak."}
          </p>
          <p className="max-w-3xl break-keep text-sm leading-relaxed text-slate md:text-base">
            {isKorean
              ? "대표 프로젝트는 부산 도시철도 체류 분석, 통신 고객 이탈 XAI, Satellite GDP Insight 세 가지입니다. 북극항로처럼 AI 도움으로 낯선 도메인을 탐색한 작업은 Explore 영역에 낮은 비중으로 분리했습니다."
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
          {isKorean ? "문제 해결 흐름" : "Working method"}
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
