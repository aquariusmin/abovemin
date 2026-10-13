import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as unknown[][]);

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => calls.push(['path', ...args]),
  revalidateTag: (...args: unknown[]) => calls.push(['tag', ...args]),
}));

import {
  revalidateArchive,
  revalidateNotes,
  revalidatePlaces,
  revalidateSettings,
  revalidateShop,
} from '@/lib/admin/revalidate';

/**
 * 이 파일이 지키는 것: 관리 화면의 변경이 **어느 공개 경로와 태그**를 다시 굽게
 * 하는가. 목록은 정확히 일치해야 한다 — 하나가 빠지면 지운 사진이 어딘가에 남고,
 * 하나가 늘면(특히 `'/'` + `'layout'`) 오타 하나에 사이트 전체의 캐시가 비워진다.
 *
 * `next/cache`는 흉내 낸다. 실제로 캐시가 비워지는지는 Next의 일이고, 여기서는
 * 무엇을 부르는지만 본다.
 */
function recorded(run: () => void): unknown[][] {
  calls.length = 0;
  run();
  return [...calls];
}

beforeEach(() => {
  calls.length = 0;
});

describe('revalidateArchive', () => {
  it('홈, 앨범 목록·상세, 사진 페이지, 타임라인, sitemap', () => {
    expect(recorded(revalidateArchive)).toEqual([
      ['path', '/'],
      ['path', '/archive'],
      ['path', '/archive/[slug]', 'page'],
      ['path', '/archive/[slug]/[id]', 'page'],
      ['path', '/archive/timeline'],
      ['path', '/sitemap.xml'],
    ]);
  });
});

describe('revalidateNotes', () => {
  const list = [
    ['tag', 'notes', { expire: 0 }],
    ['path', '/notes'],
    ['path', '/notes/[slug]', 'page'],
    ['path', '/notes/rss.xml'],
    ['path', '/sitemap.xml'],
  ];

  it('목록 태그, 노트 페이지들, RSS, sitemap', () => {
    expect(recorded(() => revalidateNotes({ presenceChanged: false }))).toEqual(list);
  });

  it('공개된 글이 0 ↔ 1로 바뀔 때만 레이아웃까지', () => {
    expect(recorded(() => revalidateNotes({ presenceChanged: true }))).toEqual([
      ...list,
      ['tag', 'notes-presence', { expire: 0 }],
      ['path', '/', 'layout'],
    ]);
  });
});

describe('revalidateShop', () => {
  it('홈, 샵 목록·상세, sitemap', () => {
    expect(recorded(revalidateShop)).toEqual([
      ['path', '/'],
      ['path', '/shop'],
      ['path', '/shop/[id]', 'page'],
      ['path', '/sitemap.xml'],
    ]);
  });
});

describe('revalidatePlaces', () => {
  it('지도가 있는 /archive만 — 앨범 상세와 홈은 좌표를 쓰지 않는다', () => {
    expect(recorded(revalidatePlaces)).toEqual([['path', '/archive']]);
  });
});

describe('revalidateSettings', () => {
  it('설정 태그 하나', () => {
    expect(recorded(revalidateSettings)).toEqual([['tag', 'site-settings', { expire: 0 }]]);
  });
});
