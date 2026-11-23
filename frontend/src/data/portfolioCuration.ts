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
