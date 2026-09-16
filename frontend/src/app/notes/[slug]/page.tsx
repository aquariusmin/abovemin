import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNoteBySlug, getPublishedNotes } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';

export const revalidate = 3600;

// 빌드 때 공개된 글만 굽는다. 그 뒤에 공개된 글은 첫 요청 때 그려진다
// (`dynamicParams` 기본값). 초안의 슬러그는 `getNoteBySlug`가 null이라 404다.
export async function generateStaticParams() {
  const notes = await getPublishedNotes().catch(() => []);
  return notes.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const note = await getNoteBySlug((await params).slug).catch(() => null);
  if (!note) return { title: 'Note not found' };
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/notes/${note.slug}` },
    openGraph: {
      title: note.title,
      description: note.summary,
      type: 'article',
      publishedTime: note.date,
    },
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const notes = await getPublishedNotes().catch(() => []);
  const note = notes.find(n => n.slug === slug) ?? null;
  if (!note) notFound();

  const others = notes.filter(n => n.slug !== note.slug).slice(0, 2);

  return (
    <main className="px-5 sm:px-6 md:px-10 py-12 md:py-20 min-h-screen bg-canvas text-ink-body">
      <article className="max-w-[720px] mx-auto">
        <Reveal as="header" className="space-y-5 border-b border-hairline pb-8" y={16}>
          <Link href="/notes" className="eyebrow text-muted-foreground hover:text-accent transition-colors">
            &larr; Notes
          </Link>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-4">
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
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] text-ink break-keep">
            {note.title}
          </h1>
          <p className="break-keep text-[15px] leading-relaxed text-slate">{note.summary}</p>
        </Reveal>

        <div className="space-y-5 py-10 md:py-14">
          {note.body.map((paragraph, i) => (
            <p key={i} className="break-keep text-[15px] leading-[1.85] text-ink-body">
              {paragraph}
            </p>
          ))}
        </div>

        {/* 해석 범위. 케이스 스터디와 같은 자리, 같은 무게로 둔다 — 이 글들이
            존재하는 이유가 여기이므로 본문 아래 각주가 아니라 본문의 끝이다. */}
        <aside className="border-l-4 border-accent bg-surface px-6 py-6 md:px-8 md:py-7">
          <p className="eyebrow text-muted-foreground mb-2.5">해석 범위</p>
          <p className="break-keep text-sm leading-relaxed text-ink-body">{note.boundary}</p>
        </aside>

        {note.relatedProject && (
          <p className="mt-8 text-sm text-slate">
            관련 작업 ·{' '}
            <Link href={`/portfolio/${note.relatedProject}`} className="link-underline text-accent">
              포트폴리오에서 보기
            </Link>
          </p>
        )}

        {others.length > 0 && (
          <nav className="mt-14 border-t border-hairline pt-8 space-y-3" aria-label="다른 글">
            <p className="eyebrow text-muted-foreground">다른 글</p>
            <ul className="space-y-2">
              {others.map(other => (
                <li key={other.slug}>
                  <Link href={`/notes/${other.slug}`} className="link-underline text-sm text-ink-body hover:text-accent">
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>

      <div className="h-16 md:h-24" />
    </main>
  );
}
