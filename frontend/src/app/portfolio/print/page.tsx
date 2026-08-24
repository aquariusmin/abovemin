import type { Metadata } from "next";
import PortfolioPrintContent from "@/components/portfolio/PortfolioPrintContent";

export const metadata: Metadata = {
  title: "포트폴리오 — 인쇄용",
  description: "이상민의 포트폴리오 사례를 정리한 인쇄용 공개 요약본입니다.",
  robots: { index: false, follow: false },
};

export default async function PortfolioPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  // The sheet always prints the curated ordering, because that is what
  // /portfolio itself now shows. Only the back-link and the URL on the header
  // depend on which overview the reader opened it from.
  return (
    <PortfolioPrintContent
      locale="ko"
      mode="submission"
      route={from === "submission" ? "submission" : "normal"}
    />
  );
}
