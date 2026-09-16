import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedNotes } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';

export const metadata: Metadata = {
  title: 'Notes',
  description: '공개 데이터를 짧게 들여다보고, 말할 수 있는 범위를 함께 적습니다.',
  alternates: { canonical: '/notes', types: { 'application/rss+xml': '/notes/rss.xml' } },
};

// 관리 화면에서 글을 저장하면 `revalidateNotes()`가 이 경로를 무효화한다.
// 한 시간은 그 신호를 놓쳤을 때의 안전망.
export const revalidate = 3600;

export default async function NotesPage() {
  // 조회 실패는 "글 없음"으로 읽는다(아카이브·sitemap과 같은 선택). 빌드 중에
  // DB가 흔들려 배포 전체가 죽는 것보다, 한 시간 동안 잠들어 있는 편이 낫다.
  const notes = await getPublishedNotes().catch(() => []);
  // 글이 없으면 이 경로는 존재하지 않는다. 빈 목록 페이지를 색인시키고
  // 푸터에서 링크하는 것보다, 첫 글이 올라올 때까지 없는 편이 낫다.
  if (notes.length === 0) notFound();

  return (
    <main className="px-5 sm:px-6 md:px-10 py-14 md:py-24 min-h-screen bg-canvas text-ink-body">
      <Reveal className="max-w-[900px] mx-auto mb-12 md:mb-16" y={16}>
        <header className="space-y-6">
          <p className="eyebrow eyebrow-marked text-primary">Notes</p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight leading-[1.05] text-ink max-w-[18ch]">
            말할 수 있는 만큼만.
          </h1>
          <p className="max-w-2xl break-keep text-[15px] leading-relaxed text-slate">
            공개 데이터를 짧게 들여다본 기록입니다. 결론보다 그 결론이 어디까지
            버티는지를 먼저 적습니다.
          </p>
          <div className="rule-accent" />
        </header>
      </Reveal>

      <div className="max-w-[900px] mx-auto divide-y divide-hairline">
        {notes.map((note, i) => (
          <Reveal as="article" key={note.slug} delay={i * 0.05} y={16} className="py-7 first:pt-0">
            <Link href={`/notes/${note.slug}`} className="group block space-y-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time dateTime={note.date} className="eyebrow text-muted-foreground">
                  {note.date.replaceAll('-', '.')}
                </time>
                {/* 밝은 캔버스에서는 `text-moss`를 쓰지 않는다 — 라임 계열이라 여기서는
                    1.8:1로, 대비 기준에 한참 못 미친다. moss는 푸터의 포레스트
                    밴드나 라이트박스 스크림처럼 어두운 면에서만 쓴다. */}
                {note.tags?.map(tag => (
                  <span key={tag} className="eyebrow text-primary">{tag}</span>
                ))}
              </div>
              <h2 className="font-serif text-xl md:text-2xl font-medium tracking-tight text-ink break-keep transition-colors group-hover:text-accent">
                {note.title}
              </h2>
              <p className="break-keep text-sm leading-relaxed text-slate">{note.summary}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="h-16 md:h-24" />
    </main>
  );
}
