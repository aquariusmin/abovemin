"use client";

import Link from "next/link";
import type { EvidenceLocale } from "@/data/portfolioEvidence";
import { getPortfolioBasePath, type PortfolioRoute } from "@/data/portfolioRouting";

export default function PrintControls({
  locale,
  route = "normal",
}: {
  locale: EvidenceLocale;
  /** Which overview to return to — the print sheet is reachable from both. */
  route?: PortfolioRoute;
}) {
  const isKorean = locale === "ko";

  return (
    <div className="portfolio-print-controls mx-auto mb-8 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 pt-6 text-xs sm:px-6">
      <Link href={getPortfolioBasePath(locale, route)} className="link-underline text-accent">
        &larr; {isKorean ? "포트폴리오로 돌아가기" : "Back to portfolio"}
      </Link>
      <button type="button" onClick={() => window.print()} className="btn-primary">
        {isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"}
      </button>
    </div>
  );
}
