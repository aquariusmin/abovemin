import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNoteBySlug, getPublishedNotes } from '@/lib/supabase';
import Reveal from '@/components/motion/Reveal';
import { buildFallback } from '@/lib/build-phase';
import { shareCard } from '@/lib/share-card';
import { displayFace, labelFace } from '@/lib/typography';

export const revalidate = 3600;

export async function generateStaticParams() {
  const notes = await getPublishedNotes().catch(() => []);
  return notes.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const note = await getNoteBySlug((await params).slug).catch(buildFallback(null));
  if (!note) return { title: 'Note not found' };
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/notes/${note.slug}` },
    // 일부만 적으면 루트의 siteName·locale이 사라진다(얕은 병합, `shareCard`).
    ...shareCard({
      title: note.title,
      description: note.summary,
      path: `/notes/${note.slug}`,
      article: { publishedTime: note.date },
    }),
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // 빌드 중에만 삼킨다. 실행 중에 삼키면 아래의 404가 캐시에 앉는다(`buildFallback`).
  const notes = await getPublishedNotes().catch(buildFallback([]));
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
            {/* 밝은 캔버스에서는 `text-moss`를 쓰지 않는다 — 대비가 1.8:1이다. */}
            {note.tags?.map(tag => (
              <span key={tag} className={`${labelFace(tag)} text-primary`}>{tag}</span>
            ))}
          </div>
          <h1 className={`${displayFace(note.title)} text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] text-ink break-keep`}>
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

        <aside className="border-l-4 border-accent bg-surface px-6 py-6 md:px-8 md:py-7">
          <p className="label-ko text-muted-foreground mb-2.5">해석 범위</p>
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
            <p className="label-ko text-muted-foreground">다른 글</p>
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
