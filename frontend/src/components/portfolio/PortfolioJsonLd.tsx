import type { PortfolioProject } from "@/data/portfolio";
import type { PortfolioLocale } from "@/data/portfolioRouting";
import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;
const EMAIL = "aquariusmin01@naver.com";
const GITHUB = "https://github.com/aquariusmin";

/** Rendered only for indexable routes: on noindex `/submission` it would describe the same person twice. */
export default function PortfolioJsonLd({
  locale,
  projects,
  basePath,
}: {
  locale: PortfolioLocale;
  projects: PortfolioProject[];
  basePath: string;
}) {
  const isKorean = locale === "ko";
  const name = isKorean ? "이상민" : "Sangmin Lee";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    inLanguage: isKorean ? "ko-KR" : "en",
    url: `${SITE}${basePath}`,
    mainEntity: {
      "@type": "Person",
      name,
      alternateName: isKorean ? "Sangmin Lee" : "이상민",
      email: `mailto:${EMAIL}`,
      url: `${SITE}${basePath}`,
      sameAs: [GITHUB],
      jobTitle: isKorean ? "데이터 분석 · 비즈니스 리서치" : "Data analysis and business research",
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: isKorean ? "광운대학교" : "Kwangwoon University",
      },
      knowsAbout: isKorean
        ? ["데이터 분석", "국제통상", "경영학", "금융·시장 리서치", "서비스 기획"]
        : ["Data analysis", "International trade", "Business administration", "Market research", "Service planning"],
    },
    hasPart: projects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      abstract: project.summary,
      url: `${SITE}${basePath}/${project.slug}`,
      genre: project.category,
      author: { "@type": "Person", name },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Escape `<` so a `</script>` inside any string can't close the block early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
