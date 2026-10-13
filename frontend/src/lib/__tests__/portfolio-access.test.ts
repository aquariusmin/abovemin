import { describe, expect, it } from 'vitest';
import { portfolioProjects } from '@/data/portfolio';
import { koreanPortfolioProjects } from '@/data/portfolio.ko';
import { getPortfolio } from '@/data/portfolioAccess';
import { archivePortfolioSlugs, featuredPortfolioSlugs } from '@/data/portfolioCuration';

/**
 * 이 파일이 지키는 것: 두 언어가 같은 프로젝트를 같은 순서·같은 번호로 보여 준다.
 * 한쪽 데이터 파일에만 프로젝트를 넣거나 큐레이션 목록에서 슬러그를 빠뜨리면
 * 사례 페이지가 조용히 404가 되므로(`dynamicParams = false`) 여기서 먼저 깨진다.
 */

const locales = ['ko', 'en'] as const;
const sources = { ko: koreanPortfolioProjects, en: portfolioProjects };

describe('getPortfolio', () => {
  it.each(locales)('%s: 대표 3개는 01…, 나머지는 A01…로 큐레이션 순서대로 번호가 붙는다', (locale) => {
    const { featured, archive } = getPortfolio(locale);
    expect(featured.map((p) => p.slug)).toEqual([...featuredPortfolioSlugs]);
    expect(featured.map((p) => p.number)).toEqual(['01', '02', '03']);
    expect(archive.map((p) => p.slug)).toEqual([...archivePortfolioSlugs]);
    expect(archive.map((p) => p.number)).toEqual(['A01', 'A02', 'A03', 'A04', 'A05', 'A06']);
  });

  it.each(locales)('%s: projects는 대표 다음에 나머지 — 사례 페이지의 이전/다음 순서', (locale) => {
    const { featured, archive, projects } = getPortfolio(locale);
    expect(projects).toEqual([...featured, ...archive]);
  });

  it.each(locales)('%s: 데이터 파일의 모든 프로젝트가 빠짐없이, 한 번씩 들어 있다', (locale) => {
    const slugs = getPortfolio(locale).projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual(sources[locale].map((p) => p.slug).sort());
  });

  it.each(locales)('%s: slugs는 데이터 파일 순서 그대로 — generateStaticParams용', (locale) => {
    expect(getPortfolio(locale).slugs).toEqual(sources[locale].map((p) => p.slug));
  });

  it.each(locales)('%s: 번호 말고는 데이터 파일의 내용 그대로다', (locale) => {
    for (const project of getPortfolio(locale).projects) {
      const source = sources[locale].find((p) => p.slug === project.slug);
      expect({ ...project, number: source?.number }).toEqual(source);
    }
  });

  it('getProject는 큐레이션 번호가 붙은 프로젝트를 돌려주고, 모르는 슬러그는 undefined', () => {
    const ko = getPortfolio('ko');
    expect(ko.getProject('telecom-churn')).toBe(ko.projects[1]);
    expect(ko.getProject('telecom-churn')?.number).toBe('02');
    expect(ko.getProject('arctic-route')?.number).toBe('A01');
    expect(ko.getProject('no-such-project')).toBeUndefined();
  });

  it('두 언어는 같은 슬러그에 같은 번호를 준다 — hreflang 쌍이 어긋나지 않는다', () => {
    const number = (locale: 'ko' | 'en') =>
      getPortfolio(locale).projects.map((p) => [p.slug, p.number]);
    expect(number('ko')).toEqual(number('en'));
  });

  it('언어마다 제 데이터 파일을 읽는다', () => {
    expect(getPortfolio('ko').getProject('telecom-churn')?.summary).toBe(
      koreanPortfolioProjects.find((p) => p.slug === 'telecom-churn')?.summary,
    );
    expect(getPortfolio('en').getProject('telecom-churn')?.summary).toBe(
      portfolioProjects.find((p) => p.slug === 'telecom-churn')?.summary,
    );
    expect(getPortfolio('ko').getProject('telecom-churn')?.summary).not.toBe(
      getPortfolio('en').getProject('telecom-churn')?.summary,
    );
  });
});
