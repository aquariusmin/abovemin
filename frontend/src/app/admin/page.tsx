"use client";

import { useEffect, useState, useCallback } from 'react';
import { cloudinary } from '@/lib/cloudinary';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  note: string | null;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   '입금 대기',
  confirmed: '입금 확인',
  shipped:   '배송 중',
  delivered: '배송 완료',
  cancelled: '취소',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  // Escalating weight through the fulfilment ramp: clay alert → cream → moss →
  // solid forest for the terminal success state.
  pending:   'bg-brick/[0.08] text-brick border border-brick-soft',
  confirmed: 'bg-cream text-secondary-foreground border border-cream-deep',
  shipped:   'bg-moss-wash text-forest border border-moss/50',
  delivered: 'bg-forest text-primary-foreground border border-forest',
  cancelled: 'bg-muted text-muted-foreground border border-border',
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending:   'confirmed',
  confirmed: 'shipped',
  shipped:   'delivered',
  delivered: null,
  cancelled: null,
};

const NEXT_STATUS_LABEL: Record<OrderStatus, string | null> = {
  pending:   '입금 확인',
  confirmed: '배송 시작',
  shipped:   '배송 완료',
  delivered: null,
  cancelled: null,
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [updating, setUpdating] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<{ id: number; message: string } | null>(null);

  // Hero settings
  const [heroImage, setHeroImage] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroError, setHeroError] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setAuthed(true);
        setPwError(false);
      } else {
        setPwError(true);
      }
    } catch {
      setPwError(true);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthed(false);
    setOrders([]);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setLoadError(true); return; }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      setHeroImage(data.hero_image || '');
      setHeroTitle(data.hero_title || '');
      setHeroSubtitle(data.hero_subtitle || '');
    }
  }, []);

  async function saveHero() {
    setHeroSaving(true);
    setHeroError(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_image: heroImage, hero_title: heroTitle, hero_subtitle: heroSubtitle }),
      });
      if (res.ok) {
        setHeroSaved(true);
        setTimeout(() => setHeroSaved(false), 2000);
      } else {
        setHeroError(true);
        setTimeout(() => setHeroError(false), 3000);
      }
    } catch {
      setHeroError(true);
      setTimeout(() => setHeroError(false), 3000);
    } finally {
      setHeroSaving(false);
    }
  }

  useEffect(() => {
    if (authed) {
      fetchOrders();
      fetchSettings();
    }
  }, [authed, fetchOrders, fetchSettings]);

  async function updateStatus(orderId: number, newStatus: OrderStatus) {
    setUpdating(orderId);
    setUpdateError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        setUpdateError({ id: orderId, message: '상태 변경에 실패했습니다. 다시 시도해 주세요.' });
      }
    } catch {
      setUpdateError({ id: orderId, message: '네트워크 오류로 상태 변경에 실패했습니다.' });
    } finally {
      setUpdating(null);
    }
  }

  async function cancelOrder(orderId: number) {
    if (!confirm('이 주문을 취소하시겠습니까?')) return;
    await updateStatus(orderId, 'cancelled');
  }

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    revenue: orders
      .filter(o => o.status !== 'cancelled')
      .reduce((s, o) => s + o.total_price, 0),
  };

  // ── 로그인 화면 ──
  if (!authed) {
    return (
      <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="eyebrow text-muted-foreground mb-3 text-center">phorage</p>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-center text-ink mb-10">Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="sr-only">Password</label>
              <input
                id="admin-password"
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setPwError(false); }}
                placeholder="Password"
                autoComplete="current-password"
                aria-invalid={pwError}
                aria-describedby={pwError ? 'admin-password-error' : undefined}
                className="w-full rounded-sm border border-border-light px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
            {pwError && (
              <p id="admin-password-error" role="alert" className="text-[11px] text-brick">
                비밀번호가 틀렸습니다.
              </p>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loginLoading ? '...' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── 어드민 대시보드 ──
  return (
    <main className="min-h-screen bg-canvas font-sans px-4 md:px-8 py-8">
      <div className="max-w-5xl mx-auto">

        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8 border-b border-hairline pb-6">
          <div>
            <p className="eyebrow text-muted-foreground mb-1.5">phorage studio</p>
            <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-ink">Order Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="btn-outline text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="text-[11px] uppercase tracking-widest text-slate hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm px-1"
            >
              Logout
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: '전체 주문', value: stats.total },
            { label: '입금 대기', value: stats.pending, highlight: stats.pending > 0 },
            { label: '입금 확인', value: stats.confirmed },
            { label: '배송 중',   value: stats.shipped },
            { label: '총 매출',   value: `₩ ${stats.revenue.toLocaleString()}`, full: true },
          ].map(s => (
            <div
              key={s.label}
              className={`p-4 rounded-sm border ${s.full ? 'col-span-2 md:col-span-1' : ''} ${
                s.highlight ? 'border-brick-soft bg-surface' : 'border-border-light bg-canvas'
              }`}
            >
              <p className="label-ko text-muted-foreground mb-2">{s.label}</p>
              <p className={`font-serif text-2xl font-medium tracking-tight ${s.highlight ? 'text-brick' : 'text-accent'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 히어로 설정 */}
        <div className="mb-8 rounded-sm border border-border-light bg-canvas p-4 md:p-6 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div>
              <p className="eyebrow text-muted-foreground mb-1">Homepage Hero</p>
              <p className="font-serif text-base font-medium tracking-tight text-ink">히어로 이미지 &amp; 텍스트 관리</p>
            </div>
            <div className="flex items-center gap-3">
              <span role="status" aria-live="polite" className="sr-only">
                {heroSaved ? '저장되었습니다' : heroError ? '저장에 실패했습니다' : ''}
              </span>
              {heroError && (
                <span aria-hidden className="text-[11px] text-brick">저장 실패</span>
              )}
              <button
                onClick={saveHero}
                disabled={heroSaving}
                className="btn-primary text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
              >
                {heroSaving ? '저장 중...' : heroSaved ? '저장됨' : 'Save'}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="hero-image" className="block label-ko text-muted-foreground mb-1.5">이미지 URL (Cloudinary or Unsplash)</label>
              <input
                id="hero-image"
                className="w-full rounded-sm border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors font-mono text-[12px]"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="hero-title" className="block label-ko text-muted-foreground mb-1.5">타이틀</label>
                <input
                  id="hero-title"
                  className="w-full rounded-sm border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={heroTitle}
                  onChange={e => setHeroTitle(e.target.value)}
                  placeholder="Collecting the Greenery"
                />
              </div>
              <div>
                <label htmlFor="hero-subtitle" className="block label-ko text-muted-foreground mb-1.5">서브타이틀</label>
                <input
                  id="hero-subtitle"
                  className="w-full rounded-sm border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={heroSubtitle}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  placeholder="무심코 지나친 숲의 색깔..."
                />
              </div>
            </div>
            {heroImage && /^https:\/\/.+/.test(heroImage) && (
              <div className="mt-2">
                <p className="label-ko text-muted-foreground mb-2">
                  미리보기 <span className="text-[11px]">— 홈에서도 이 비율 그대로 실립니다</span>
                </p>
                {/* No fixed ratio and no object-cover: the home hero builds its
                    frame from the photo's own proportions, so a preview that
                    imposed a 16:6 banner was previewing a crop the home page
                    never makes. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cloudinary(heroImage, { width: 800 })}
                  alt="Hero preview"
                  className="block h-auto w-full max-w-md rounded-sm bg-surface"
                />
              </div>
            )}
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="주문 상태 필터">
          {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map(s => {
            const active = filterStatus === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-sm text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-border-light text-slate hover:text-ink hover:border-ink'
                }`}
              >
                {s === 'all' ? `전체 (${orders.length})` : `${STATUS_LABELS[s]} (${orders.filter(o => o.status === s).length})`}
              </button>
            );
          })}
        </div>

        {/* 주문 목록 */}
        {loading ? (
          <div className="py-20 text-center text-[11px] uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading orders...
          </div>
        ) : loadError ? (
          <div className="py-20 text-center space-y-4">
            <p role="alert" className="text-[11px] uppercase tracking-widest text-brick">
              주문을 불러오지 못했습니다.
            </p>
            <button
              onClick={fetchOrders}
              className="btn-outline text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              다시 시도
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
            No orders found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const isExpanded = expandedId === order.id;
              const next = NEXT_STATUS[order.status];
              const nextLabel = NEXT_STATUS_LABEL[order.status];
              const panelId = `order-panel-${order.id}`;

              return (
                <div key={order.id} className="rounded-sm border border-border-light bg-canvas">
                  {/* 요약 행 */}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 px-5 py-4 text-left cursor-pointer hover:bg-surface transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {/* id + 상태 (모바일에서 한 줄, 데스크톱에서 인라인) */}
                    <div className="flex items-center gap-3 sm:contents">
                      <span className="text-[11px] text-muted-foreground font-mono w-12 flex-shrink-0">#{order.id}</span>

                      <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm font-medium flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>

                      <span aria-hidden className="text-muted-foreground text-xs ml-auto sm:hidden">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{order.name}</p>
                      <p className="text-[11px] text-slate truncate">{order.email}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right flex-shrink-0">
                      <div>
                        <p className="text-sm font-medium text-accent">₩&nbsp;{order.total_price.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('ko-KR', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span aria-hidden className="text-muted-foreground text-xs ml-1 flex-shrink-0 hidden sm:inline">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* 펼침 상세 */}
                  {isExpanded && (
                    <div id={panelId} className="border-t border-border-light px-5 py-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2 text-ink-body">
                          <p><span className="label-ko text-muted-foreground inline-block w-16">연락처</span>{order.phone || '-'}</p>
                          <p><span className="label-ko text-muted-foreground inline-block w-16">주소</span>{order.address}</p>
                          {order.note && <p><span className="label-ko text-muted-foreground inline-block w-16">메모</span>{order.note}</p>}
                        </div>
                        <div>
                          <p className="label-ko text-muted-foreground mb-2">주문 상품</p>
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs text-ink-body">
                                <span>{item.name} ×{item.quantity}</span>
                                <span className="text-accent font-medium">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="pt-3 border-t border-hairline space-y-3">
                        <div className="flex flex-wrap gap-3">
                          {next && nextLabel && (
                            <button
                              disabled={updating === order.id}
                              onClick={() => updateStatus(order.id, next)}
                              className="btn-primary text-[11px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
                            >
                              {updating === order.id ? '처리 중...' : `→ ${nextLabel}`}
                            </button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              disabled={updating === order.id}
                              onClick={() => cancelOrder(order.id)}
                              className="btn-outline text-[11px] uppercase tracking-widest text-slate hover:text-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
                            >
                              취소
                            </button>
                          )}
                        </div>
                        {updateError?.id === order.id && (
                          <p role="alert" className="text-[11px] text-brick">
                            {updateError.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="h-16" />
      </div>
    </main>
  );
}
