"use client";

import Link from "next/link";
import type { EvidenceLocale } from "@/data/portfolioEvidence";

export default function PrintControls({ locale }: { locale: EvidenceLocale }) {
  const isKorean = locale === "ko";

  return (
    <div className="portfolio-print-controls mx-auto mb-8 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 pt-6 text-xs sm:px-6">
      <Link href={isKorean ? "/ko/portfolio" : "/portfolio"} className="font-bold text-accent hover:underline">
        &larr; {isKorean ? "포트폴리오로 돌아가기" : "Back to portfolio"}
      </Link>
      <button type="button" onClick={() => window.print()} className="bg-accent px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-85">
        {isKorean ? "인쇄 · PDF로 저장" : "Print / Save as PDF"}
      </button>
    </div>
  );
}
