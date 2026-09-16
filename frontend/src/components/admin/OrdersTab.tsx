"use client";

import { useEffect, useState } from 'react';
import { adminFetch, downloadText, errorMessage } from '@/lib/admin/client';
import { ordersToCsv } from '@/lib/admin/orders-csv';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import {
  BTN_SM,
  CHECKBOX_CLASS,
  FILTER_CHIP_CLASS,
  INPUT_CLASS,
  INPUT_COMPACT,
  LABEL_CLASS,
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
} from './adminStyles';

/**
 * 주문 관리 — 상태 흐름, 송장, 관리자 메모, 안내 메일, CSV.
 *
 * 상태는 앞으로만 간다(입금 대기 → 입금 확인 → 배송 중 → 배송 완료). 되돌리기
 * 버튼이 없는 이유: 고객에게 이미 "배송 시작" 메일이 나간 주문을 "입금 대기"로
 * 되돌리는 것은 화면 한 번의 클릭으로 할 일이 아니다.
 */

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
  zipcode: string | null;
  address: string;
  note: string | null;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  admin_memo?: string | null;
}

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const NEXT: Record<OrderStatus, { status: OrderStatus; label: string } | null> = {
  pending: { status: 'confirmed', label: '입금 확인' },
  confirmed: { status: 'shipped', label: '배송 시작' },
  shipped: { status: 'delivered', label: '배송 완료' },
  delivered: null,
  cancelled: null,
};

/** 자주 쓰는 택배사. 자유 입력이지만 표기가 흩어지지 않게 제안한다. */
const CARRIERS = ['CJ대한통운', '우체국택배', '한진택배', '롯데택배', '로젠택배', '경동택배'];

function isStatus(value: string | null): value is OrderStatus {
  return STATUSES.includes(value as OrderStatus);
}

export default function OrdersTab() {
  const { params } = useAdminNav();
  const statusParam = params.get('status');

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<OrderStatus | 'all'>(isStatus(statusParam) ? statusParam : 'all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [seenStatus, setSeenStatus] = useState(statusParam);
  if (seenStatus !== statusParam) {
    setSeenStatus(statusParam);
    setFilter(isStatus(statusParam) ? statusParam : 'all');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{ orders: Order[]; migrationPending: boolean }>('/api/admin/orders');
        if (cancelled) return;
        setOrders(data.orders);
        setMigrationPending(data.migrationPending);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, '주문을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loadError && !orders) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p role="alert" className="text-sm text-brick">{loadError}</p>
        <button type="button" onClick={() => setReloadKey(k => k + 1)} className={`btn-outline ${BTN_SM}`}>다시 시도</button>
      </div>
    );
  }
  if (!orders) return <LoadingLine />;

  const needle = query.trim().toLowerCase();
  const filtered = orders.filter(order => {
    if (filter !== 'all' && order.status !== filter) return false;
    if (!needle) return true;
    return [String(order.id), order.name, order.email, order.phone ?? '', order.tracking_number ?? '']
      .some(value => value.toLowerCase().includes(needle));
  });
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_price, 0);

  function replaceOrder(next: Order) {
    setOrders(prev => (prev ?? []).map(order => (order.id === next.id ? { ...order, ...next } : order)));
  }

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = filter === 'all' ? '' : `-${filter}`;
    downloadText(`orders-${stamp}${suffix}.csv`, ordersToCsv(filtered), 'text/csv;charset=utf-8');
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="주문"
        title={`주문 ${orders.length}건`}
        description={<>취소를 뺀 매출 <span className="tabular-nums text-forest">₩&nbsp;{revenue.toLocaleString()}</span></>}
        actions={
          <>
            <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className={`btn-outline ${BTN_SM}`}>
              CSV 내려받기 ({filtered.length})
            </button>
            <button type="button" onClick={() => setReloadKey(k => k + 1)} className={`btn-ghost ${BTN_SM} text-slate`}>
              새로 고침
            </button>
          </>
        }
      />

      {migrationPending && <MigrationNotice feature="송장 번호·관리자 메모" />}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="주문 상태 필터">
          {(['all', ...STATUSES] as const).map(status => (
            <button
              key={status}
              type="button"
              data-active={filter === status}
              aria-pressed={filter === status}
              onClick={() => setFilter(status)}
              className={FILTER_CHIP_CLASS}
            >
              {status === 'all' ? '전체' : ORDER_STATUS_LABEL[status]}
              <span className="tabular-nums opacity-80">
                {status === 'all' ? orders.length : orders.filter(o => o.status === status).length}
              </span>
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="주문 검색"
          placeholder="번호·이름·이메일·송장"
          className={`${INPUT_COMPACT} md:max-w-xs`}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyLine>{orders.length === 0 ? '아직 주문이 없습니다.' : '조건에 맞는 주문이 없습니다.'}</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              migrationPending={migrationPending}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              onUpdated={replaceOrder}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 주문 한 건 ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  expanded,
  migrationPending,
  onToggle,
  onUpdated,
}: {
  order: Order;
  expanded: boolean;
  migrationPending: boolean;
  onToggle: () => void;
  onUpdated: (order: Order) => void;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? '');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [memo, setMemo] = useState(order.admin_memo ?? '');
  /** `배송 시작`을 누를 때 배송 안내 메일을 같이 보낼지. 기본은 보낸다. */
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  const next = NEXT[order.status];
  const panelId = `order-panel-${order.id}`;
  const detailsDirty =
    carrier.trim() !== (order.tracking_carrier ?? '') ||
    tracking.trim() !== (order.tracking_number ?? '') ||
    memo.trim() !== (order.admin_memo ?? '');

  async function update(body: Record<string, unknown>, success: string, key: string) {
    setBusy(key);
    setMessage(null);
    try {
      const result = await adminFetch<{ order: Order; email: 'sent' | 'failed' | 'skipped' }>('/api/admin/orders', 'PATCH', {
        id: order.id,
        ...body,
      });
      onUpdated(result.order);
      const emailNote =
        result.email === 'sent' ? ' 배송 안내 메일을 보냈습니다.' : result.email === 'failed' ? ' 단, 배송 안내 메일은 보내지 못했습니다 — 아래에서 다시 보내 주세요.' : '';
      setMessage({ tone: result.email === 'failed' ? 'error' : 'ok', text: success + emailNote });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, '저장하지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  function saveDetails() {
    const body: Record<string, unknown> = {};
    if (carrier.trim() !== (order.tracking_carrier ?? '')) body.tracking_carrier = carrier;
    if (tracking.trim() !== (order.tracking_number ?? '')) body.tracking_number = tracking;
    if (memo.trim() !== (order.admin_memo ?? '')) body.admin_memo = memo;
    void update(body, '송장·메모를 저장했습니다.', 'details');
  }

  function advance() {
    if (!next) return;
    const body: Record<string, unknown> = { status: next.status };
    if (next.status === 'shipped') {
      // 배송 시작과 송장 저장을 한 번에 — 송장을 적고 저장을 잊은 채 "배송 시작"을
      // 누르면, 서버는 송장이 없다고 보고 메일을 건너뛴다.
      if (tracking.trim() !== (order.tracking_number ?? '')) body.tracking_number = tracking;
      if (carrier.trim() !== (order.tracking_carrier ?? '')) body.tracking_carrier = carrier;
      body.notify = notify;
    }
    void update(body, `${next.label}(으)로 바꿨습니다.`, 'status');
  }

  async function cancel() {
    const ok = await confirm({
      title: `주문 #${order.id}을 취소할까요?`,
      body: <p>{order.name} · ₩&nbsp;{order.total_price.toLocaleString()} — 고객에게 메일은 가지 않습니다.</p>,
      confirmLabel: '주문 취소',
    });
    if (ok) void update({ status: 'cancelled' }, '주문을 취소했습니다.', 'status');
  }

  async function resend(kind: 'confirmation' | 'shipping') {
    const ok = await confirm({
      title: kind === 'shipping' ? '배송 안내 메일을 다시 보낼까요?' : '주문 확인 메일을 다시 보낼까요?',
      body: <p>{order.email}로 보냅니다.</p>,
      confirmLabel: '보내기',
      tone: 'primary',
    });
    if (!ok) return;
    setBusy(`mail:${kind}`);
    setMessage(null);
    try {
      await adminFetch('/api/admin/orders/email', 'POST', { id: order.id, kind });
      setMessage({ tone: 'ok', text: `${order.email}로 메일을 보냈습니다.` });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, '메일을 보내지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  const created = new Date(order.created_at).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className={`rounded-lg border bg-card shadow-xs ${expanded ? 'border-forest/40' : 'border-border'}`}>
      {dialog}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full flex-col gap-2 rounded-lg px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:gap-4 md:px-5"
      >
        <span className="flex items-center gap-3 sm:contents">
          <span className="w-12 shrink-0 font-mono text-[12px] text-muted-foreground">#{order.id}</span>
          <span className={`${ORDER_STATUS_CHIP[order.status]} shrink-0`}>{ORDER_STATUS_LABEL[order.status]}</span>
          <span aria-hidden className="ml-auto text-xs text-muted-foreground sm:hidden">{expanded ? '▲' : '▼'}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{order.name}</span>
          <span className="block truncate text-[12px] text-slate">{order.email}</span>
        </span>
        {order.tracking_number && (
          <span className="hidden truncate font-mono text-[12px] text-slate md:block">
            {order.tracking_carrier} {order.tracking_number}
          </span>
        )}
        <span className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
          <span className="block text-sm font-medium tabular-nums text-forest">₩&nbsp;{order.total_price.toLocaleString()}</span>
          <span className="block text-[11px] text-muted-foreground">{created}</span>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-5 border-t border-border px-4 py-5 md:px-5">
          <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
            <dl className="space-y-2 text-ink-body">
              <Row label="연락처">{order.phone || '-'}</Row>
              <Row label="주소">{order.zipcode ? `[${order.zipcode}] ` : ''}{order.address}</Row>
              {order.note && <Row label="요청">{order.note}</Row>}
            </dl>
            <div>
              <p className="label-ko mb-2 text-muted-foreground">주문 상품</p>
              <ul className="space-y-1">
                {(order.items ?? []).map((item, i) => (
                  <li key={i} className="flex justify-between gap-3 text-[13px] text-ink-body">
                    <span>{item.name} ×{item.quantity}</span>
                    <span className="tabular-nums text-forest">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-[12rem_1fr]">
            <div>
              <label htmlFor={`order-${order.id}-carrier`} className={LABEL_CLASS}>택배사</label>
              <input
                id={`order-${order.id}-carrier`}
                list="order-carriers"
                className={INPUT_COMPACT}
                value={carrier}
                disabled={migrationPending}
                onChange={e => setCarrier(e.target.value)}
              />
              <datalist id="order-carriers">
                {CARRIERS.map(name => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor={`order-${order.id}-tracking`} className={LABEL_CLASS}>송장번호</label>
              <input
                id={`order-${order.id}-tracking`}
                className={`${INPUT_COMPACT} font-mono`}
                value={tracking}
                disabled={migrationPending}
                onChange={e => setTracking(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor={`order-${order.id}-memo`} className={LABEL_CLASS}>관리자 메모 (고객에게 보이지 않음)</label>
              <textarea
                id={`order-${order.id}-memo`}
                rows={2}
                className={INPUT_CLASS}
                value={memo}
                disabled={migrationPending}
                onChange={e => setMemo(e.target.value)}
              />
            </div>
            <div className="flex justify-end md:col-span-2">
              <button type="button" onClick={saveDetails} disabled={!detailsDirty || busy !== null} className={`btn-outline ${BTN_SM}`}>
                {busy === 'details' ? '저장 중…' : '송장·메모 저장'}
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {next && (
                <button type="button" onClick={advance} disabled={busy !== null} className={`btn-primary ${BTN_SM}`}>
                  {busy === 'status' ? '처리 중…' : `→ ${next.label}`}
                </button>
              )}
              {next?.status === 'shipped' && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate">
                  <input type="checkbox" className={CHECKBOX_CLASS} checked={notify} onChange={e => setNotify(e.target.checked)} />
                  송장번호가 있으면 배송 안내 메일 보내기
                </label>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <button type="button" onClick={() => void cancel()} disabled={busy !== null} className={`btn-ghost ${BTN_SM} ml-auto text-brick`}>
                  주문 취소
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-ko mr-1 text-muted-foreground">안내 메일 다시 보내기</span>
              <button type="button" onClick={() => void resend('confirmation')} disabled={busy !== null} className={`btn-outline ${BTN_SM}`}>
                주문 확인
              </button>
              <button
                type="button"
                onClick={() => void resend('shipping')}
                disabled={busy !== null || !order.tracking_number}
                title={order.tracking_number ? undefined : '송장번호를 저장하면 보낼 수 있습니다'}
                className={`btn-outline ${BTN_SM}`}
              >
                배송 안내
              </button>
            </div>
            <StatusLine message={message} />
          </div>
        </div>
      )}
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="label-ko w-14 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
