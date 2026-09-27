"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UNAUTHORIZED_EVENT } from '@/lib/admin/client';
import { tabKeyTarget } from '@/lib/admin/tab-keys';
import { BTN_SM } from './adminStyles';
import AdminLogin, { SessionExpiredDialog } from './AdminLogin';
import { useConfirm } from './AdminUi';
import { SessionEpochContext } from './SessionRetry';
import { DISCARD_CONFIRM, UnsavedGuardProvider, useUnsavedRegistry } from './UnsavedGuard';
import OverviewTab from './OverviewTab';
import ArchiveTab from './ArchiveTab';
import AlbumsTab from './AlbumsTab';
import ShopTab from './ShopTab';
import OrdersTab from './OrdersTab';
import SettingsTab from './SettingsTab';
import NotesTab from './NotesTab';

/**
 * 관리 화면의 셸 — 세션 확인, 로그인, 탭.
 *
 * 탭은 URL(`?tab=`)에 둔다. 새로고침하거나 링크를 공유해도 같은 탭이 열리고,
 * 개요의 "데이터 점검"이 `?tab=archive&album=korea&filter=untitled`처럼 고칠
 * 자리로 바로 보낼 수 있다.
 *
 * 한 번 연 탭은 숨길 뿐 언마운트하지 않는다. 사진을 올려 두고(파일은 이미
 * Cloudinary에 있다) 저장 전에 다른 탭을 봤다가 돌아오면, 대기 목록이 그대로
 * 있어야 한다 — 사라지면 그 파일들은 아무도 가리키지 않는 원본이 된다.
 */

export const ADMIN_TABS = [
  { id: 'overview', label: '개요' },
  { id: 'archive', label: '아카이브' },
  { id: 'albums', label: '앨범' },
  { id: 'shop', label: '샵' },
  { id: 'orders', label: '주문' },
  { id: 'notes', label: '노트' },
  { id: 'settings', label: '설정' },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]['id'];

function isTab(value: string | null): value is AdminTab {
  return ADMIN_TABS.some(tab => tab.id === value);
}

interface AdminNav {
  tab: AdminTab;
  /** 현재 URL의 쿼리. 탭별 초기 선택(`album`, `filter`, `product`)을 읽는다. */
  params: URLSearchParams;
  /**
   * `replace`: 방문 기록을 쌓지 않는다. 탭 바의 화살표 이동은 한 번 누를 때마다
   * 탭을 여는데, 그게 전부 기록에 남으면 뒤로 가기가 탭을 하나씩 되짚는다.
   */
  go: (tab: AdminTab, extra?: Record<string, string>, options?: { replace?: boolean }) => void;
}

const AdminNavContext = createContext<AdminNav | null>(null);

export function useAdminNav(): AdminNav {
  const nav = useContext(AdminNavContext);
  if (!nav) throw new Error('useAdminNav must be used inside AdminApp');
  return nav;
}

export default function AdminApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get('tab');
  const tab: AdminTab = isTab(rawTab) ? rawTab : 'overview';

  const go = useCallback(
    (next: AdminTab, extra: Record<string, string> = {}, options: { replace?: boolean } = {}) => {
      const query = new URLSearchParams({ tab: next, ...extra });
      const href = `${pathname}?${query.toString()}`;
      if (options.replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, pathname],
  );

  const [authed, setAuthed] = useState(false);
  // 쿠키 세션이 살아 있는지 아직 모르는 동안. 로그인 폼을 먼저 그렸다가 곧바로
  // 대시보드로 바꾸면, 이미 로그인한 사람에게 비밀번호 칸이 한 번 번쩍인다.
  const [sessionChecked, setSessionChecked] = useState(false);
  // 대시보드를 쓰던 중에 세션이 끝났다. 대시보드는 그대로 두고 위에 로그인을 띄운다.
  const [sessionExpired, setSessionExpired] = useState(false);
  // 다시 로그인할 때마다 올린다. 만료 중에 불러오기에 실패한 탭이 이걸 보고
  // 다시 읽는다(`SessionRetry.tsx`).
  const [sessionEpoch, setSessionEpoch] = useState(0);

  const { registry: unsaved, hasUnsaved } = useUnsavedRegistry();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // 한 번이라도 연 탭. 숨겨 두되 상태(업로드 대기, 입력 중인 값)는 유지한다.
  const [visited, setVisited] = useState<ReadonlySet<AdminTab>>(() => new Set([tab]));
  if (!visited.has(tab)) setVisited(new Set([...visited, tab]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/auth');
        const body = res.ok ? await res.json() : null;
        if (!cancelled && body?.authed) setAuthed(true);
      } catch {
        // 네트워크 실패는 '로그인 안 됨'으로 취급하고 폼을 보여준다.
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 탭 바가 붙을 높이 = 사이트 내비게이션(fixed)의 실제 높이. 내비게이션은
  // 글자 크기가 뷰포트를 따라 변하는 유동 높이라(모바일 약 64px, 데스크톱 약
  // 77px) 숫자를 박아 두면 그 틈으로 아래 내용이 비치거나 탭 바 윗부분이
  // 가려진다. 직접 재고, 크기가 바뀌면 다시 잰다.
  //
  // 기본값은 0이다. /admin은 공개 내비게이션을 그리지 않으므로(`lib/chrome.ts`)
  // 보통은 잴 대상이 없고, 그때 64를 남겨 두면 탭 바 위로 빈 띠가 생긴다.
  const [navOffset, setNavOffset] = useState(0);
  useEffect(() => {
    const nav = Array.from(document.querySelectorAll('nav')).find(
      el => getComputedStyle(el).position === 'fixed',
    );
    if (!nav) return;
    const observer = new ResizeObserver(() => setNavOffset(Math.round(nav.getBoundingClientRect().bottom)));
    observer.observe(nav);
    return () => observer.disconnect();
  }, [authed]);

  // 어느 탭에서든 401을 받으면(`adminFetch`가 이벤트를 낸다) 다시 로그인을 받는다.
  // `authed`를 내리면 대시보드가 언마운트되어 쓰던 초안이 사라진다 — 그래서
  // 대시보드 위에 로그인 대화상자를 띄운다(`SessionExpiredDialog`). 아직 로그인
  // 전이면 이 값은 쓰이지 않고 평범한 로그인 화면이 그대로 보인다.
  useEffect(() => {
    const onUnauthorized = () => setSessionExpired(true);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  async function logout() {
    // 로그아웃은 대시보드를 언마운트한다 — 쓰던 초안도 같이 사라진다.
    if (hasUnsaved && !(await confirm({ ...DISCARD_CONFIRM, confirmLabel: '버리고 로그아웃' }))) return;
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => undefined);
    setAuthed(false);
    setSessionExpired(false);
    setVisited(new Set([tab]));
  }

  if (!sessionChecked) {
    return <main className="min-h-screen bg-canvas" aria-hidden />;
  }

  if (!authed) {
    return (
      <AdminLogin
        onSuccess={() => {
          setAuthed(true);
          setSessionExpired(false);
        }}
      />
    );
  }

  const nav: AdminNav = { tab, params: new URLSearchParams(searchParams.toString()), go };

  return (
    <UnsavedGuardProvider registry={unsaved}>
      <SessionEpochContext.Provider value={sessionEpoch}>
        <AdminNavContext.Provider value={nav}>
          <main className="min-h-screen bg-canvas pb-24">
            {confirmDialog}
            {sessionExpired && (
              <SessionExpiredDialog
                onSuccess={() => {
                  setSessionExpired(false);
                  setSessionEpoch(n => n + 1);
                }}
                onDismiss={() => setSessionExpired(false)}
              />
            )}
            <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:px-10 md:pt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="eyebrow eyebrow-marked text-muted-foreground">phorage studio</p>
                  <h1 className="font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">관리</h1>
                </div>
                <button type="button" onClick={logout} className={`btn-ghost ${BTN_SM} text-slate`}>
                  로그아웃
                </button>
              </div>
              <hr className="rule-accent mt-6" />
            </header>

            {/* 사이트 내비게이션(fixed) 바로 아래에 붙는다. 좁은 폭에서 일곱 탭이
                한 줄에 안 들어가면 가로 스크롤로 둔다 — 줄바꿈하면 탭 바 높이가
                폭마다 달라져 아래 내용이 튄다. */}
            <div className="sticky z-30 border-b border-border bg-canvas/95 backdrop-blur" style={{ top: navOffset }}>
              <div
                role="tablist"
                aria-label="관리 메뉴"
                className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 md:px-8"
                onKeyDown={event => {
                  // 탭 사이는 화살표로 옮기고, 옮기면 곧바로 연다(자동 활성화 —
                  // 숨긴 탭은 언마운트하지 않으니 여는 비용이 없다).
                  const index = ADMIN_TABS.findIndex(item => item.id === tab);
                  const next = tabKeyTarget(event.key, index, ADMIN_TABS.length);
                  if (next === null) return;
                  event.preventDefault();
                  const target = ADMIN_TABS[next].id;
                  go(target, {}, { replace: true });
                  document.getElementById(`admin-tab-${target}`)?.focus();
                }}
              >
                {ADMIN_TABS.map(item => {
                  const active = item.id === tab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`admin-tab-${item.id}`}
                      aria-selected={active}
                      // 한 번도 연 적 없는 탭의 패널은 아직 문서에 없다 — 없는 id를
                      // 가리키지 않는다.
                      aria-controls={visited.has(item.id) ? `admin-panel-${item.id}` : undefined}
                      // Tab 키는 선택된 탭에만 멈춘다. 나머지는 화살표로.
                      tabIndex={active ? 0 : -1}
                      onClick={() => go(item.id)}
                      className={`relative shrink-0 px-3 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm md:px-4 ${
                        active ? 'text-forest' : 'text-slate hover:text-ink'
                      }`}
                    >
                      {item.label}
                      {/* 활성 표시는 사이트 내비게이션과 같은 moss 밑줄. */}
                      <span
                        aria-hidden
                        className={`absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-moss transition-opacity md:inset-x-4 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:px-10 md:pt-10">
              {ADMIN_TABS.map(item =>
                visited.has(item.id) ? (
                  <section
                    key={item.id}
                    id={`admin-panel-${item.id}`}
                    role="tabpanel"
                    aria-labelledby={`admin-tab-${item.id}`}
                    hidden={item.id !== tab}
                  >
                    {item.id === 'overview' && <OverviewTab active={tab === 'overview'} />}
                    {item.id === 'archive' && <ArchiveTab />}
                    {item.id === 'albums' && <AlbumsTab active={tab === 'albums'} />}
                    {item.id === 'shop' && <ShopTab />}
                    {item.id === 'orders' && <OrdersTab />}
                    {item.id === 'notes' && <NotesTab active={tab === 'notes'} />}
                    {item.id === 'settings' && <SettingsTab />}
                  </section>
                ) : null,
              )}
            </div>
          </main>
        </AdminNavContext.Provider>
      </SessionEpochContext.Provider>
    </UnsavedGuardProvider>
  );
}
