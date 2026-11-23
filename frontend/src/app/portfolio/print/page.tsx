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
  return (
    <PortfolioPrintContent
      locale="ko"
      route={from === "submission" ? "submission" : "normal"}
    />
  );
}
