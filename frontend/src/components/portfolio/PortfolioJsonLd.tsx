import type { PortfolioProject } from "@/data/portfolio";
import type { PortfolioLocale } from "@/data/portfolioRouting";
import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;
const EMAIL = "aquariusmin01@naver.com";
const GITHUB = "https://github.com/aquariusmin";

/**
 * `ProfilePage` + `Person` for the portfolio overview.
 *
 * The page is a person's body of work, which is exactly what this vocabulary
 * describes — and none of it was inferable from the markup: the projects are
 * headings and cards, the identity is a mailto and a GitHub link. Each case
 * study is emitted as a `CreativeWork` with its own URL so the overview points
 * at the pages it links to rather than restating their prose.
 *
 * Rendered only for indexable routes. Emitting it on the noindex `/submission`
 * family would describe the same person twice at two URLs, which is the kind
 * of duplicate a search engine resolves by trusting neither.
 */
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
      // Server-rendered from data this repo owns, so nothing hostile reaches
      // it today. The `<` escape is here anyway, for the same reason
      // `shop/[id]` has it: a `</script>` inside any of these strings would
      // close the block early and turn the rest into markup, and "the data is
      // ours" is a property of today's `portfolio.ts`, not of the component.
      // One escape costs nothing and stops that from being a future problem.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
