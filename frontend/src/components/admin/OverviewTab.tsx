"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { cloudinary } from '@/lib/cloudinary';
import { adminFetch, errorMessage } from '@/lib/admin/client';
import { issueCount, type DataCheckReport } from '@/lib/admin/data-checks';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader } from './AdminUi';
import { BTN_SM, CHIP_KO, EYEBROW_CLASS, ORDER_STATUS_CHIP, ORDER_STATUS_LABEL, PANEL_CLASS } from './adminStyles';

/**
 * 개요. 세 가지를 한 화면에: 지금 규모(숫자), 최근에 무엇이 들어왔나, 그리고
 * **공개 화면에서 티가 나는 빈칸** — 각 항목에서 고칠 자리로 바로 간다.
 *
 * 탭이 다시 보일 때마다 새로 읽는다. 다른 탭에서 제목을 고치고 돌아왔는데
 * 점검 목록이 그대로면, 고친 게 반영이 안 된 것처럼 보인다.
 */

interface OverviewData {
  counts: {
    albums: number;
    unpublishedAlbums: number;
    photos: number;
    hiddenPhotos: number;
    products: number;
    productsInStock: number;
    ordersByStatus: Record<string, number>;
  };
  recent: Array<{
    id: number;
    src: string;
    title: string | null;
    album_slug: string;
    album_title: string;
    hidden: boolean;
  }>;
  report: DataCheckReport;
  migrationPending: boolean;
}

const COVER_PROBLEM: Record<string, string> = {
  missing: '커버가 없습니다',
  not_own: '커버가 이 앨범의 사진이 아닙니다',
  duplicate: '다른 앨범과 같은 커버를 씁니다',
};

export default function OverviewTab({ active }: { active: boolean }) {
  const { go } = useAdminNav();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 다시 점검 버튼은 이 값을 올린다. 불러오기는 effect 안에만 둔다 — 탭이
  // 보일 때와 버튼을 눌렀을 때가 같은 경로를 타고, 늦게 온 응답이 새 응답을
  // 덮지 않도록 취소 플래그를 건다.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await adminFetch<OverviewData>('/api/admin/overview');
        if (cancelled) return;
        setData(next);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e, '개요를 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, reloadKey]);

  if (!data) {
    return error ? <p role="alert" className="py-8 text-center text-sm text-brick">{error}</p> : <LoadingLine />;
  }

  const { counts, recent, report } = data;
  const issues = issueCount(report);

  return (
    <div className="space-y-10">
      {data.migrationPending && <MigrationNotice feature="숨김·공개 설정과 최근 추가 순서" />}

      {/* ── 숫자 ── */}
      <section className="space-y-4" aria-labelledby="overview-counts">
        <h2 id="overview-counts" className={EYEBROW_CLASS}>한눈에</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="앨범" value={counts.albums} note={counts.unpublishedAlbums > 0 ? `비공개 ${counts.unpublishedAlbums}` : undefined} onClick={() => go('albums')} />
          <Stat label="사진" value={counts.photos} onClick={() => go('archive')} />
          <Stat label="숨긴 사진" value={counts.hiddenPhotos} onClick={() => go('archive', { filter: 'hidden' })} />
          <Stat label="판매 중 상품" value={counts.productsInStock} note={`전체 ${counts.products}`} onClick={() => go('shop')} />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts.ordersByStatus).map(([status, count]) => (
            <button
              key={status}
              type="button"
              onClick={() => go('orders', { status })}
              className={`${ORDER_STATUS_CHIP[status]} cursor-pointer gap-2 py-1.5 transition-transform hover:-translate-y-px`}
            >
              {ORDER_STATUS_LABEL[status]}
              <span className="tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 데이터 점검 ── */}
      <section className={`${PANEL_CLASS} p-5 md:p-6 space-y-5`}>
        <SectionHeader
          eyebrow="데이터 점검"
          title={issues === 0 ? '고칠 것이 없습니다' : `고칠 곳 ${issues}건`}
          description="공개 화면에서 티가 나는 빈칸과 어긋난 표기입니다. 항목을 누르면 고칠 자리로 갑니다."
          actions={<button type="button" onClick={() => setReloadKey(k => k + 1)} className={`btn-outline ${BTN_SM}`}>다시 점검</button>}
        />
        {issues === 0 ? (
          <EmptyLine>제목·장소·커버·가격 모두 채워져 있습니다.</EmptyLine>
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {report.placeholderTitles.map(item => (
              <IssueRow key={`t-${item.slug}`} kind="제목 없음" onFix={() => go('archive', { album: item.slug, filter: 'untitled' })}>
                <strong className="font-medium text-ink">{item.title}</strong> — 제목이 비었거나 &ldquo;-&rdquo;인 사진 {item.count}장
              </IssueRow>
            ))}
            {report.placeholderLocations.map(item => (
              <IssueRow key={`l-${item.slug}`} kind="장소 없음" onFix={() => go('archive', { album: item.slug, filter: 'nolocation' })}>
                <strong className="font-medium text-ink">{item.title}</strong> — 장소가 비었거나 &ldquo;-&rdquo;인 사진 {item.count}장
              </IssueRow>
            ))}
            {report.locationVariants.map(group => {
              const [main, ...others] = group.variants;
              return (
                <IssueRow
                  key={`v-${group.key}`}
                  kind="장소 표기"
                  fixLabel="이름 바꾸기"
                  onFix={() => go('archive', { rename: others[others.length - 1].value, to: main.value })}
                >
                  같은 곳이 여러 표기로 나뉘어 있습니다:{' '}
                  {group.variants.map((variant, i) => (
                    <span key={variant.value}>
                      {i > 0 && ' · '}
                      <span className="font-medium text-ink">&ldquo;{variant.value}&rdquo;</span>
                      <span className="tabular-nums text-muted-foreground">&nbsp;{variant.count}</span>
                    </span>
                  ))}
                </IssueRow>
              );
            })}
            {report.coverIssues.map(item => (
              <IssueRow key={`c-${item.slug}`} kind="커버" onFix={() => go('albums', { album: item.slug })}>
                <strong className="font-medium text-ink">{item.title}</strong> — {COVER_PROBLEM[item.problem]}
                {item.sharedWith && ` (${item.sharedWith.join(', ')})`}
              </IssueRow>
            ))}
            {report.emptyAlbums.map(item => (
              <IssueRow key={`e-${item.slug}`} kind="빈 앨범" onFix={() => go('albums', { album: item.slug })}>
                <strong className="font-medium text-ink">{item.title}</strong> — 사진이 한 장도 없습니다
              </IssueRow>
            ))}
            {report.unpricedProducts.map(item => (
              <IssueRow key={`p-${item.id}`} kind="가격" onFix={() => go('shop', { product: String(item.id) })}>
                <strong className="font-medium text-ink">{item.name}</strong> — 판매 중인데 가격이 0원입니다
              </IssueRow>
            ))}
          </ul>
        )}
      </section>

      {/* ── 최근 사진 ── */}
      <section className="space-y-4" aria-labelledby="overview-recent">
        <div className="flex items-center justify-between gap-3">
          <h2 id="overview-recent" className={EYEBROW_CLASS}>최근 추가된 사진</h2>
          <button type="button" onClick={() => go('archive')} className="link-underline text-[13px] text-slate">
            아카이브 전체
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyLine>아직 사진이 없습니다.</EmptyLine>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {recent.map(photo => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => go('archive', { album: photo.album_slug })}
                  className="group block w-full text-left focus-visible:outline-none"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-md bg-surface ring-ring/50 group-focus-visible:ring-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinary(photo.src, { width: 240 })}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${photo.hidden ? 'opacity-40' : ''}`}
                    />
                    {photo.hidden && <span className={`badge-solid absolute left-1.5 top-1.5 ${CHIP_KO}`}>숨김</span>}
                  </span>
                  <span className="mt-1.5 block truncate text-[12px] text-ink-body">{photo.title || '제목 없음'}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{photo.album_title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note, onClick }: { label: string; value: number; note?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card-hair p-4 text-left md:p-5">
      <span className="label-ko block text-muted-foreground">{label}</span>
      <span className="mt-2 block font-serif text-3xl font-medium tracking-tight text-forest tabular-nums">
        {value.toLocaleString()}
      </span>
      {note && <span className="mt-1 block text-[12px] text-slate">{note}</span>}
    </button>
  );
}

function IssueRow({
  kind,
  children,
  onFix,
  fixLabel = '고치기',
}: {
  kind: string;
  children: ReactNode;
  onFix: () => void;
  fixLabel?: string;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className={`chip ${CHIP_KO} w-fit shrink-0 border-brick-soft text-brick`}>{kind}</span>
      <span className="min-w-0 flex-1 text-sm text-ink-body">{children}</span>
      <button type="button" onClick={onFix} className={`btn-outline ${BTN_SM} w-fit shrink-0`}>
        {fixLabel} <span aria-hidden>→</span>
      </button>
    </li>
  );
}
