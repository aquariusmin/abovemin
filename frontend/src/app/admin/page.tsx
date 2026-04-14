"use client";

import { useEffect, useState, useCallback } from 'react';

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
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [updating, setUpdating] = useState<number | null>(null);

  // Hero settings
  const [heroImage, setHeroImage] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    setLoginLoading(false);
    if (res.ok) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthed(false);
    setOrders([]);
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/orders');
    if (res.status === 401) { setAuthed(false); return; }
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
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
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hero_image: heroImage, hero_title: heroTitle, hero_subtitle: heroSubtitle }),
    });
    setHeroSaving(false);
    if (res.ok) {
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 2000);
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
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: newStatus }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setUpdating(null);
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
      <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center font-serif">
        <div className="w-full max-w-sm px-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-2 font-sans text-center">phorage</p>
          <h2 className="text-2xl font-light italic text-center text-[#333] mb-10">Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setPwError(false); }}
              placeholder="Password"
              className="w-full border border-gray-200 px-4 py-3 text-sm font-sans focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            {pwError && <p className="text-[10px] text-red-400 font-sans">비밀번호가 틀렸습니다.</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-accent text-white text-[10px] uppercase tracking-widest font-sans font-bold disabled:opacity-50"
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
    <main className="min-h-screen bg-[#FAF9F6] font-sans px-4 md:px-8 py-8">
      <div className="max-w-5xl mx-auto">

        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8 border-b border-black/5 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400 mb-1">phorage studio</p>
            <h1 className="text-2xl font-serif font-light italic text-[#333]">Order Management</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchOrders}
              className="px-4 py-2 text-[10px] uppercase tracking-widest border border-gray-200 text-gray-500 hover:border-accent hover:text-accent transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-[10px] uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors"
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
            { label: '총 매출',   value: `₩ ${stats.revenue.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className={`p-4 border ${s.highlight ? 'border-yellow-300 bg-yellow-50' : 'border-gray-100 bg-white'}`}>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">{s.label}</p>
              <p className={`text-xl font-bold ${s.highlight ? 'text-yellow-600' : 'text-accent'}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 히어로 설정 */}
        <div className="mb-8 border border-gray-100 bg-white p-4 md:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-1">Homepage Hero</p>
              <p className="text-sm font-serif italic text-[#333]">히어로 이미지 &amp; 텍스트 관리</p>
            </div>
            <button
              onClick={saveHero}
              disabled={heroSaving}
              className={`px-5 py-2 text-[10px] uppercase tracking-widest font-bold transition-all ${
                heroSaved ? 'bg-green-600 text-white' :
                'bg-accent text-white hover:opacity-90'
              } disabled:opacity-50`}
            >
              {heroSaving ? '저장 중...' : heroSaved ? '✓ 저장됨' : 'Save'}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">이미지 URL (Cloudinary or Unsplash)</label>
              <input
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors font-mono text-[12px]"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">타이틀</label>
                <input
                  className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={heroTitle}
                  onChange={e => setHeroTitle(e.target.value)}
                  placeholder="Collecting the Greenery"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">서브타이틀</label>
                <input
                  className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                  value={heroSubtitle}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  placeholder="무심코 지나친 숲의 색깔..."
                />
              </div>
            </div>
            {heroImage && /^https:\/\/.+/.test(heroImage) && (
              <div className="mt-2">
                <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">미리보기</p>
                <div className="aspect-[16/6] bg-gray-100 relative overflow-hidden rounded-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImage} alt="Hero preview" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 상태 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 text-[10px] uppercase tracking-widest transition-all ${
                filterStatus === s
                  ? 'bg-accent text-white'
                  : 'border border-gray-200 text-gray-400 hover:text-accent hover:border-accent'
              }`}
            >
              {s === 'all' ? `전체 (${orders.length})` : `${STATUS_LABELS[s]} (${orders.filter(o => o.status === s).length})`}
            </button>
          ))}
        </div>

        {/* 주문 목록 */}
        {loading ? (
          <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 animate-pulse">
            Loading orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300">
            No orders found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const isExpanded = expandedId === order.id;
              const next = NEXT_STATUS[order.status];
              const nextLabel = NEXT_STATUS_LABEL[order.status];

              return (
                <div key={order.id} className="border border-gray-100 bg-white">
                  {/* 요약 행 */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <span className="text-[11px] text-gray-400 font-mono w-12 flex-shrink-0">#{order.id}</span>

                    <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm font-bold flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{order.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{order.email}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-accent">₩ {order.total_price.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <span className="text-gray-300 text-xs ml-1 flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* 펼침 상세 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2 text-gray-700">
                          <p><span className="text-[9px] uppercase tracking-widest text-gray-400 inline-block w-16">연락처</span>{order.phone || '-'}</p>
                          <p><span className="text-[9px] uppercase tracking-widest text-gray-400 inline-block w-16">주소</span>{order.address}</p>
                          {order.note && <p><span className="text-[9px] uppercase tracking-widest text-gray-400 inline-block w-16">메모</span>{order.note}</p>}
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-2">주문 상품</p>
                          <div className="space-y-1">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs text-gray-700">
                                <span>{item.name} ×{item.quantity}</span>
                                <span className="text-accent font-bold">₩ {(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-3 pt-3 border-t border-gray-50">
                        {next && nextLabel && (
                          <button
                            disabled={updating === order.id}
                            onClick={() => updateStatus(order.id, next)}
                            className="px-5 py-2 bg-accent text-white text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-all disabled:opacity-50"
                          >
                            {updating === order.id ? '처리 중...' : `→ ${nextLabel}`}
                          </button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <button
                            disabled={updating === order.id}
                            onClick={() => cancelOrder(order.id)}
                            className="px-5 py-2 border border-gray-200 text-gray-400 text-[10px] uppercase tracking-widest hover:border-red-300 hover:text-red-400 transition-all disabled:opacity-50"
                          >
                            취소
                          </button>
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
