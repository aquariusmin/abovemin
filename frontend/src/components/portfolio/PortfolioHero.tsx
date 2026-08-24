import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import type { EvidenceLocale } from "@/data/portfolioEvidence";
import {
  getPortfolioBasePath,
  getPortfolioPrintPath,
  type PortfolioMode,
  type PortfolioRoute,
} from "@/data/portfolioRouting";

// `mode` picks the copy, `route` picks the URLs — see `portfolioRouting.ts`.
// `/portfolio` passes mode="submission" route="normal" to get the curated
// reading on the public, indexed URL family.
export default function PortfolioHero({
  locale,
  mode = "normal",
  route = mode,
}: {
  locale: EvidenceLocale;
  mode?: PortfolioMode;
  route?: PortfolioRoute;
}) {
  const isKorean = locale === "ko";
  const isKoreanSubmission = isKorean && mode === "submission";
  const alternateLocale = isKorean ? "en" : "ko";

  return (
    <Reveal as="header" className="grid gap-10 border-b border-hairline pb-14 md:grid-cols-12 md:items-end md:pb-20" y={16}>
      <div className="space-y-7 md:col-span-8">
        <p className={`eyebrow-marked text-primary ${isKorean ? 'label-ko' : 'eyebrow'}`}>
          {isKorean ? "포트폴리오 · 이상민" : "Portfolio · Sangmin Lee"}
        </p>
        <div className="space-y-5">
          <h1 className="max-w-5xl break-keep font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-7xl">
            {isKoreanSubmission
              ? "데이터의 가정을 검증하고, 의사결정 가능한 지표로 바꿉니다."
              : isKorean
              ? "데이터를 보고, 시장 맥락을 붙여, 다음 판단까지 정리합니다."
              : "I connect data with business context, then turn it into a next step."}
          </h1>
          <p className="max-w-3xl break-keep text-base font-medium leading-relaxed text-accent md:text-xl">
            {isKoreanSubmission
              ? "국제통상·경영 배경 위에서 공공데이터, 고객 데이터, 대체 경제지표를 분석합니다. 좋은 숫자를 만드는 것보다 그 숫자가 어디까지 말할 수 있는지 확인하는 데 집중합니다."
              : isKorean
              ? "광운대학교 국제통상학부에서 국제통상을 전공하고 경영학을 복수전공하고 있습니다. 데이터 분석, 금융·시장 리서치, 서비스 기획이 만나는 일을 준비하고 있습니다."
              : "International Trade major and Business Administration double-major candidate, preparing for work across analytics, financial research, and service planning."}
          </p>
          <p className="max-w-3xl break-keep text-sm leading-relaxed text-slate md:text-base">
            {isKoreanSubmission
              ? "대표 프로젝트는 부산 도시철도 체류 분석, 통신 고객 이탈 XAI, Satellite GDP Insight 세 가지입니다. 북극항로처럼 AI 도움으로 낯선 도메인을 탐색한 작업은 Explore 영역에 낮은 비중으로 분리했습니다."
              : isKorean
              ? "고객 이탈, 야간조도와 GDP, 대한항공 재무분석, 모의투자 시스템, 사진 굿즈 MVP, 설문 연구를 담았습니다. 성과처럼 읽힐 수 있는 숫자는 출처와 한계를 같이 적었습니다."
              : "The projects cover churn analysis, night-light GDP research, Korean Air financial analysis, a paper-trading system, a photography-commerce MVP, and survey research. When a number could sound like an outcome, I show the caveat beside it."}
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
            ? isKoreanSubmission
              ? ["문제 정의", "데이터 가정 확인", "지표·모델 설계", "검증과 수정", "해석 범위"]
              : ["질문 정리", "데이터 확인", "분석·모델링", "해석 범위", "다음 판단"]
            : ["Frame the question", "Check the data", "Analyze / model", "Set boundaries", "Recommend next steps"]
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
