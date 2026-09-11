/**
 * 짧은 글.
 *
 * 이 사이트의 포트폴리오가 가진 힘은 프로젝트 목록이 아니라 **말할 수 있는
 * 범위를 먼저 긋는 태도**다 — "해석 범위", "이렇게 주장하지 않습니다", R²를
 * 설명력으로만 쓰는 것. 지금 그 태도는 케이스 스터디 안에서만 보인다.
 * 공개 데이터를 짧게 들여다보고 무엇을 말할 수 있고 무엇은 말할 수 없는지
 * 적는 글이 쌓이면, 그게 사이트의 앞면으로 나온다.
 *
 * 형식은 케이스 스터디를 따르지 않는다. 케이스 스터디는 완결된 작업이고
 * 이건 생각의 조각이라, 강제하는 필드가 적다. 다만 `boundary`만은 선택이
 * 아니다 — 이 글들이 존재하는 이유가 거기에 있기 때문이다.
 *
 * ── 첫 글을 쓰는 법 ──────────────────────────────────────────────────────
 * 아래 배열에 항목을 하나 넣으면 된다. 그 순간 `/notes`가 살아나고, 푸터
 * 링크와 RSS와 sitemap이 따라 붙는다. 비어 있는 동안에는 어디에도 나타나지
 * 않는다 — 빈 목록 페이지를 링크해 두는 것보다 없는 편이 낫다.
 *
 *   {
 *     slug: "night-lights-and-gdp",
 *     title: "야간조도로 GDP를 얼마나 말할 수 있나",
 *     date: "2026-09-20",
 *     summary: "한 문단. 목록과 RSS에 그대로 쓰인다.",
 *     tags: ["대체데이터", "회귀"],
 *     body: [
 *       "문단 하나가 배열 항목 하나다. 마크다운 파서를 두지 않은 이유는",
 *       "글이 다섯 편일 때 파서가 글보다 무겁기 때문이다.",
 *     ],
 *     boundary: "무엇을 말하지 않는지. 이 줄이 이 글의 목적이다.",
 *   }
 */
export type Note = {
  slug: string;
  title: string;
  /** `YYYY-MM-DD`. 목록 정렬과 `<time>`에 쓰인다. */
  date: string;
  summary: string;
  tags?: string[];
  /** 문단 배열. 한 항목이 한 `<p>`. */
  body: string[];
  /** 이 글이 주장하지 **않는** 것. 필수다. */
  boundary: string;
  /** 관련 케이스 스터디가 있으면 그 slug. */
  relatedProject?: string;
};

export const notes: Note[] = [];

/** 최신 글이 먼저. 목록·RSS·sitemap이 전부 이걸 쓴다. */
export function getNotes(): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date));
}

export function getNote(slug: string): Note | undefined {
  return notes.find(n => n.slug === slug);
}
