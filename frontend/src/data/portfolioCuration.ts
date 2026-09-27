/**
 * The curated reading of the portfolio, shared by both languages.
 *
 * `/portfolio` shows three featured projects and demotes the rest to an
 * Explore archive. `/en/portfolio` used to render the old flat list instead,
 * so the two halves of each hreflang pair disagreed on which work leads and
 * even on case numbers ("Case 04" in one language was "Case 01" in the
 * other). One list, used by both, keeps them in step.
 */
export const featuredPortfolioSlugs = [
  "busan-station-dwell",
  "telecom-churn",
  "satellite-gdp",
] as const;

export const archivePortfolioSlugs = [
  "arctic-route",
  "quant-trading-fleet",
  "korean-air",
  "financial-ai-model-study",
  "phorage",
  "blood-type-survey",
] as const;

/** Picks `slugs` out of `projects` in that order and renumbers them —
 *  `01…` for the featured set, `A01…` for the archive. */
export function curatePortfolioProjects<T extends { slug: string; number: string }>(
  projects: readonly T[],
  slugs: readonly string[],
  prefix = "",
): T[] {
  return slugs.flatMap((slug, index) => {
    const project = projects.find((item) => item.slug === slug);
    if (!project) return [];
    return [{ ...project, number: `${prefix}${String(index + 1).padStart(2, "0")}` }];
  });
}
