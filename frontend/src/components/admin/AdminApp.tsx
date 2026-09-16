"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UNAUTHORIZED_EVENT } from '@/lib/admin/client';
import { BTN_SM } from './adminStyles';
import AdminLogin from './AdminLogin';
import OverviewTab from './OverviewTab';
import ArchiveTab from './ArchiveTab';
import AlbumsTab from './AlbumsTab';
import ShopTab from './ShopTab';
import OrdersTab from './OrdersTab';
import SettingsTab from './SettingsTab';

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
  go: (tab: AdminTab, extra?: Record<string, string>) => void;
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
    (next: AdminTab, extra: Record<string, string> = {}) => {
      const query = new URLSearchParams({ tab: next, ...extra });
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  const [authed, setAuthed] = useState(false);
  // 쿠키 세션이 살아 있는지 아직 모르는 동안. 로그인 폼을 먼저 그렸다가 곧바로
  // 대시보드로 바꾸면, 이미 로그인한 사람에게 비밀번호 칸이 한 번 번쩍인다.
  const [sessionChecked, setSessionChecked] = useState(false);

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
  const [navOffset, setNavOffset] = useState(64);
  useEffect(() => {
    const nav = Array.from(document.querySelectorAll('nav')).find(
      el => getComputedStyle(el).position === 'fixed',
    );
    if (!nav) return;
    const observer = new ResizeObserver(() => setNavOffset(Math.round(nav.getBoundingClientRect().bottom)));
    observer.observe(nav);
    return () => observer.disconnect();
  }, [authed]);

  // 어느 탭에서든 401을 받으면 로그인으로 돌아간다(`adminFetch`가 이벤트를 낸다).
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => undefined);
    setAuthed(false);
    setVisited(new Set([tab]));
  }

  if (!sessionChecked) {
    return <main className="min-h-screen bg-canvas" aria-hidden />;
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  const nav: AdminNav = { tab, params: new URLSearchParams(searchParams.toString()), go };

  return (
    <AdminNavContext.Provider value={nav}>
      <main className="min-h-screen bg-canvas pb-24">
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

        {/* 사이트 내비게이션(fixed) 바로 아래에 붙는다. 좁은 폭에서 여섯 탭이
            한 줄에 안 들어가면 가로 스크롤로 둔다 — 줄바꿈하면 탭 바 높이가
            폭마다 달라져 아래 내용이 튄다. */}
        <div className="sticky z-30 border-b border-border bg-canvas/95 backdrop-blur" style={{ top: navOffset }}>
          <div
            role="tablist"
            aria-label="관리 메뉴"
            className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 md:px-8"
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
                  aria-controls={`admin-panel-${item.id}`}
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
                {item.id === 'settings' && <SettingsTab />}
              </section>
            ) : null,
          )}
        </div>
      </main>
    </AdminNavContext.Provider>
  );
}
