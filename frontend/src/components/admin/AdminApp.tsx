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
  params: URLSearchParams;
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  // 재로그인마다 올린다 — 만료 중 불러오기에 실패한 탭이 다시 읽는 신호(`SessionRetry.tsx`).
  const [sessionEpoch, setSessionEpoch] = useState(0);

  const { registry: unsaved, hasUnsaved } = useUnsavedRegistry();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // 한 번 연 탭은 숨기기만 한다 — 언마운트하면 업로드 대기(이미 Cloudinary에 있음)와 초안이 사라진다.
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
        // 네트워크 실패는 '로그인 안 됨'으로 취급한다.
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 내비 높이는 유동이라 직접 잰다. /admin엔 내비가 없으니 기본값 0(64면 탭 바 위에 빈 띠).
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

  // 401이면 대시보드를 언마운트하지 않고 위에 로그인을 띄운다 — 쓰던 초안을 지킨다.
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
                <div className="flex items-center gap-2">
                  {/* next/link가 아닌 <a>: 전체 이동이어야 초안이 있을 때 beforeunload 경고가 뜬다. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a href="/" className={`btn-ghost ${BTN_SM} text-slate`}>
                    사이트로
                  </a>
                  <button type="button" onClick={logout} className={`btn-ghost ${BTN_SM} text-slate`}>
                    로그아웃
                  </button>
                </div>
              </div>
              <hr className="rule-accent mt-6" />
            </header>

            {/* 줄바꿈 대신 가로 스크롤 — 탭 바 높이가 폭마다 달라지면 아래 내용이 튄다. */}
            <div className="sticky z-30 border-b border-border bg-canvas/95 backdrop-blur" style={{ top: navOffset }}>
              <div
                role="tablist"
                aria-label="관리 메뉴"
                className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 md:px-8"
                onKeyDown={event => {
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
                      // 연 적 없는 탭의 패널은 아직 문서에 없다 — 없는 id를 가리키지 않는다.
                      aria-controls={visited.has(item.id) ? `admin-panel-${item.id}` : undefined}
                      tabIndex={active ? 0 : -1}
                      onClick={() => go(item.id)}
                      className={`relative shrink-0 px-3 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm md:px-4 ${
                        active ? 'text-forest' : 'text-slate hover:text-ink'
                      }`}
                    >
                      {item.label}
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
