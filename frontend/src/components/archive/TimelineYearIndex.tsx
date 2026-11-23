"use client";

import { useEffect, useRef, useState } from 'react';

interface YearEntry {
  anchor: string;
  label: string;
  count: number;
}

export default function TimelineYearIndex({ years }: { years: YearEntry[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const sections = years
      .map(year => document.getElementById(year.anchor))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    // 화면 위쪽 1/3 띠에 걸친 섹션 중 가장 위의 것이 "지금 읽는 해"다.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = years.find(year => visible.has(year.anchor));
        if (first) setCurrent(first.anchor);
        else if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.2) setCurrent(null);
      },
      { rootMargin: '-20% 0px -66% 0px' },
    );
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [years]);

  // 지금 해의 pill이 보이게 목록만 옆으로 민다. `scrollIntoView`는 페이지를 세로로도 움직여 쓰지 않는다.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // 명시한 `behavior: 'smooth'`는 전역 움직임 줄이기 규칙(CSS)이 막지 못한다.
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (!current) {
      list.scrollTo({ left: 0, behavior });
      return;
    }
    const pill = list.querySelector<HTMLElement>(`[data-anchor="${current}"]`);
    if (!pill) return;
    const left = pill.offsetLeft - list.clientWidth / 2 + pill.clientWidth / 2;
    list.scrollTo({ left, behavior });
  }, [current]);

  return (
    <ol ref={listRef} className="flex gap-2 overflow-x-auto py-3 px-5 sm:px-6 md:px-10 scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => (
        <li key={year.anchor} className="shrink-0">
          <a
            href={`#${year.anchor}`}
            data-anchor={year.anchor}
            data-active={current === year.anchor}
            aria-current={current === year.anchor ? 'location' : undefined}
            className="btn-outline gap-1.5 px-3.5 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {year.label}
            <span className={current === year.anchor ? 'text-primary-foreground/70' : 'text-muted-foreground'}>{year.count}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
