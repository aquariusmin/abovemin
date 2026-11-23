"use client";

import { useEffect, useState } from 'react';
import { adminFetch, downloadText, errorMessage } from '@/lib/admin/client';
import { ORDER_EMAIL_STATUS_MIGRATION } from '@/lib/admin/limits';
import { ordersToCsv } from '@/lib/admin/orders-csv';
import {
  STAGES,
  STAGE_LABEL,
  dialable,
  isOpen,
  nextStep,
  smsBody,
  smsHref,
  stageFromParam,
  stageOf,
  statusLabel,
  type OrderStatus,
  type Stage,
} from '@/lib/admin/order-flow';
import { DELIVERY_LABEL, DELIVERY_METHODS, deliveryMethodFromRow, type DeliveryMethod } from '@/lib/delivery';
import { emailTrackingStart, isBuyerEmailMissing } from '@/lib/order-email-status';
import { orderItemLabel, type OrderItemRecord } from '@/lib/order-items';
import { useAdminNav } from './AdminApp';
import { EmptyLine, LoadingLine, MigrationNotice, SectionHeader, StatusLine, useConfirm, type Message } from './AdminUi';
import { useRetryAfterRelogin } from './SessionRetry';
import {
  BTN_SM,
  CHECKBOX_CLASS,
  CHIP_KO,
  FILTER_CHIP_CLASS,
  INPUT_CLASS,
  INPUT_COMPACT,
  LABEL_CLASS,
  ORDER_STATUS_CHIP,
} from './adminStyles';

/**
 * 주문 관리. 운영자가 하는 일의 순서대로 보인다: 입금을 맞춰 보고(입금 대기),
 * 준비해서 보내거나 전하고(준비 중 → 배송 중), 끝난다(완료).
 *
 * 수령 방법마다 흐름이 다르다(`lib/admin/order-flow.ts`).
 *   택배      입금 확인 → 배송 시작(송장) → 배송 완료
 *   대면 전달  입금 확인 → 전달 완료
 *
 * 체크아웃은 이메일을 받지 않는다. 손님에게 알리는 일은 운영자가 문자로 한다 —
 * 카드마다 지금 단계에 맞는 문구를 만들어 두고(복사 / 문자 앱으로 열기), 전화를
 * 바로 걸 수 있게 한다. 이메일이 있는 옛 주문에만 메일 재발송이 남는다.
 */

type OrderItem = OrderItemRecord;

interface Order {
  id: number;
  created_at: string;
  name: string;
  /** 체크아웃이 이메일을 받지 않게 된 뒤의 주문은 null(또는 ''). 메일 기능이 꺼진다. */
  email: string | null;
  phone: string | null;
  zipcode: string | null;
  address: string;
  /** `20261123010000_orders_delivery_method` 이후 컬럼. 없으면 택배(메모의 표시로 대면 전달을 아는 경우 제외). */
  delivery_method?: string | null;
  note: string | null;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  admin_memo?: string | null;
  /** `20261014000000_order_email_status` 이후 컬럼. 그 전의 주문은 null(=모름). */
  buyer_email_sent_at?: string | null;
  owner_email_sent_at?: string | null;
}

/** 자주 쓰는 택배사. 자유 입력이지만 표기가 흩어지지 않게 제안한다. */
const CARRIERS = ['CJ대한통운', '우체국택배', '한진택배', '롯데택배', '로젠택배', '경동택배'];

type DeliveryFilter = 'all' | DeliveryMethod;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function OrdersTab() {
  const { params } = useAdminNav();
  const statusParam = params.get('status');

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [bankInfo, setBankInfo] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [emailStatusPending, setEmailStatusPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stage, setStage] = useState<Stage | 'all'>(stageFromParam(statusParam) ?? 'all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 개요 탭의 링크로 들어오면(`?status=…`) 그 단계로 맞춘다.
  const [seenStatus, setSeenStatus] = useState(statusParam);
  if (seenStatus !== statusParam) {
    setSeenStatus(statusParam);
    setStage(stageFromParam(statusParam) ?? 'all');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminFetch<{
          orders: Order[];
          migrationPending: boolean;
          emailStatusPending?: boolean;
          bankInfo?: string | null;
        }>('/api/admin/orders');
        if (cancelled) return;
        setOrders(data.orders);
        setBankInfo(data.bankInfo ?? null);
        setMigrationPending(data.migrationPending);
        setEmailStatusPending(Boolean(data.emailStatusPending));
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(errorMessage(e, '주문을 불러오지 못했습니다.'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 세션이 끝난 동안 불러오기에 실패했으면, 다시 로그인한 뒤 한 번 더 읽는다.
  useRetryAfterRelogin(loadError !== null && !orders, () => setReloadKey(k => k + 1));

  if (loadError && !orders) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p role="alert" className="text-sm text-brick">{loadError}</p>
        <button type="button" onClick={() => setReloadKey(k => k + 1)} className={`btn-outline ${BTN_SM}`}>다시 시도</button>
      </div>
    );
  }
  if (!orders) return <LoadingLine />;

  const inDelivery = orders.filter(order => deliveryFilter === 'all' || deliveryMethodFromRow(order) === deliveryFilter);
  const countAt = (s: Stage) => inDelivery.filter(order => stageOf(order.status) === s).length;
  const needle = query.trim().toLowerCase();
  const filtered = inDelivery.filter(order => {
    if (stage !== 'all' && stageOf(order.status) !== stage) return false;
    if (!needle) return true;
    return [String(order.id), order.name, order.email ?? '', order.phone ?? '', order.tracking_number ?? '']
      .some(value => value.toLowerCase().includes(needle));
  });
  // 옛 주문의 null은 "모름"이다 — 기록이 시작된 뒤의 주문만 미발송으로 본다.
  const trackingStart = emailTrackingStart(orders);
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_price, 0);
  const waiting = orders.filter(o => o.status === 'pending').length;
  const preparing = orders.filter(o => o.status === 'confirmed').length;

  function replaceOrder(next: Order) {
    setOrders(prev => (prev ?? []).map(order => (order.id === next.id ? { ...order, ...next } : order)));
  }

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = [stage === 'all' ? '' : stage, deliveryFilter === 'all' ? '' : deliveryFilter].filter(Boolean).join('-');
    downloadText(`orders-${stamp}${suffix ? `-${suffix}` : ''}.csv`, ordersToCsv(filtered), 'text/csv;charset=utf-8');
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="주문"
        title={waiting + preparing > 0 ? `할 일 ${waiting + preparing}건` : '밀린 주문이 없습니다'}
        description={
          <>
            입금 대기 <span className="tabular-nums text-ink">{waiting}</span>
            {', '}준비 중 <span className="tabular-nums text-ink">{preparing}</span>
            {'. '}전체 {orders.length}건, 취소를 뺀 매출{' '}
            <span className="tabular-nums text-forest">₩&nbsp;{revenue.toLocaleString()}</span>
          </>
        }
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
      {emailStatusPending && <MigrationNotice feature="주문 메일 발송 기록(메일 미발송 표시)" file={ORDER_EMAIL_STATUS_MIGRATION} />}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="단계">
          {(['all', ...STAGES] as const).map(s => (
            <button
              key={s}
              type="button"
              data-active={stage === s}
              aria-pressed={stage === s}
              onClick={() => setStage(s)}
              className={FILTER_CHIP_CLASS}
            >
              {s === 'all' ? '전체' : STAGE_LABEL[s]}
              <span className="tabular-nums opacity-80">{s === 'all' ? inDelivery.length : countAt(s)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="받는 방법">
            {(['all', ...DELIVERY_METHODS] as const).map(d => (
              <button
                key={d}
                type="button"
                data-active={deliveryFilter === d}
                aria-pressed={deliveryFilter === d}
                onClick={() => setDeliveryFilter(d)}
                className={FILTER_CHIP_CLASS}
              >
                {d === 'all' ? '모든 수령 방법' : DELIVERY_LABEL[d]}
              </button>
            ))}
          </div>
          <input
            type="search"
            aria-label="주문 검색"
            placeholder="번호·이름·연락처·송장"
            className={`${INPUT_COMPACT} md:max-w-xs`}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyLine>{orders.length === 0 ? '아직 주문이 없습니다.' : '조건에 맞는 주문이 없습니다.'}</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              bankInfo={bankInfo}
              expanded={expandedId === order.id}
              migrationPending={migrationPending}
              emailMissing={isBuyerEmailMissing(order, trackingStart)}
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

/** 단계별로 "무엇을 확인하고 누르는지" 한 줄. */
function stepHint(order: Order, delivery: DeliveryMethod): string | null {
  switch (order.status) {
    case 'pending':
      return `입금자명 ‘${order.name}’, ₩${order.total_price.toLocaleString()} 입금을 확인한 뒤 누르세요.`;
    case 'confirmed':
      return delivery === 'pickup' ? '손님을 만나 전한 뒤 누르세요.' : '송장번호를 적고 누르면 함께 저장됩니다.';
    case 'shipped':
      return '도착을 확인하면 누르세요.';
    default:
      return null;
  }
}

function OrderCard({
  order,
  bankInfo,
  expanded,
  migrationPending,
  emailMissing,
  onToggle,
  onUpdated,
}: {
  order: Order;
  bankInfo: string | null;
  expanded: boolean;
  migrationPending: boolean;
  /** 입금 안내 메일이 나간 기록이 없다(`isBuyerEmailMissing`). 이메일 있는 옛 주문만. */
  emailMissing: boolean;
  onToggle: () => void;
  onUpdated: (order: Order) => void;
}) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? '');
  const [tracking, setTracking] = useState(order.tracking_number ?? '');
  const [memo, setMemo] = useState(order.admin_memo ?? '');
  /** `배송 시작`을 누를 때 배송 안내 메일을 같이 보낼지. 이메일 있는 옛 주문만. */
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  const delivery = deliveryMethodFromRow(order);
  const next = nextStep(order.status, delivery);
  const open = isOpen(order.status);
  const phone = dialable(order.phone);
  const sms = smsBody(order, delivery, bankInfo);
  const showsTracking = delivery === 'parcel' && (order.status === 'confirmed' || order.status === 'shipped' || Boolean(order.tracking_number));
  const panelId = `order-panel-${order.id}`;
  const trackingDirty =
    carrier.trim() !== (order.tracking_carrier ?? '') || tracking.trim() !== (order.tracking_number ?? '');
  const memoDirty = memo.trim() !== (order.admin_memo ?? '');
  const itemsSummary = (order.items ?? []).map(item => `${orderItemLabel(item)} ×${item.quantity}`).join(', ');

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
        result.email === 'sent' ? ' 배송 안내 메일을 보냈습니다.' : result.email === 'failed' ? ' 단, 배송 안내 메일은 보내지 못했습니다. 아래에서 다시 보내 주세요.' : '';
      setMessage({ tone: result.email === 'failed' ? 'error' : 'ok', text: success + emailNote });
    } catch (e) {
      setMessage({ tone: 'error', text: errorMessage(e, '저장하지 못했습니다.') });
    } finally {
      setBusy(null);
    }
  }

  function trackingBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (tracking.trim() !== (order.tracking_number ?? '')) body.tracking_number = tracking;
    if (carrier.trim() !== (order.tracking_carrier ?? '')) body.tracking_carrier = carrier;
    return body;
  }

  function advance() {
    if (!next) return;
    const body: Record<string, unknown> = { status: next.status };
    if (next.status === 'shipped') {
      // 배송 시작과 송장 저장을 한 번에 — 송장을 적고 저장을 잊은 채 누르면
      // 손님에게 알릴 송장이 비어 있게 된다.
      Object.assign(body, trackingBody());
      body.notify = Boolean(order.email) && notify;
    }
    void update(body, `${next.label}(으)로 바꿨습니다.`, 'status');
  }

  async function cancel() {
    const ok = await confirm({
      title: `주문 #${order.id}을 취소할까요?`,
      body: <p>{order.name}, ₩&nbsp;{order.total_price.toLocaleString()}. 손님에게는 따로 알려 주세요.</p>,
      confirmLabel: '주문 취소',
    });
    if (ok) void update({ status: 'cancelled' }, '주문을 취소했습니다.', 'status');
  }

  async function copyText(text: string, what: string) {
    const ok = await copy(text);
    setMessage(ok ? { tone: 'ok', text: `${what}을(를) 복사했습니다.` } : { tone: 'error', text: '복사하지 못했습니다. 직접 선택해 복사해 주세요.' });
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
      // 서버도 같은 때에 시각을 적는다. 컬럼이 아직 없으면(필드 자체가 없음)
      // 화면도 지어내지 않는다.
      if (kind === 'confirmation' && order.buyer_email_sent_at !== undefined) {
        onUpdated({ ...order, buyer_email_sent_at: new Date().toISOString() });
      }
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
  const address = order.zipcode ? `[${order.zipcode}] ${order.address}` : order.address;

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
        <span className="flex flex-wrap items-center gap-2 sm:w-56 sm:shrink-0">
          <span className="w-10 shrink-0 font-mono text-[12px] text-muted-foreground">#{order.id}</span>
          <span className={`${ORDER_STATUS_CHIP[order.status]} shrink-0 whitespace-nowrap`}>{statusLabel(order.status, delivery)}</span>
          {/* 택배가 기본이라 대면 전달만 표시한다 — 주소 없는 주문을 바로 알아보게. */}
          {delivery === 'pickup' && (
            <span className={`chip ${CHIP_KO} shrink-0 whitespace-nowrap bg-muted text-ink-body`}>{DELIVERY_LABEL.pickup}</span>
          )}
          {emailMissing && (
            <span
              className={`chip-brick ${CHIP_KO} shrink-0 whitespace-nowrap`}
              title="입금 안내 메일이 나간 기록이 없습니다. 주문을 열어 '주문 확인' 메일을 다시 보내 주세요."
            >
              메일 미발송
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {order.name}
            {order.phone && <span className="ml-2 font-normal tabular-nums text-slate">{order.phone}</span>}
          </span>
          <span className="block truncate text-[12px] text-slate">{itemsSummary || '-'}</span>
        </span>
        <span className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-right">
          <span className="block text-sm font-medium tabular-nums text-forest">₩&nbsp;{order.total_price.toLocaleString()}</span>
          <span className="block text-[11px] text-muted-foreground">{created}</span>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="space-y-5 border-t border-border px-4 py-5 md:px-5">
          {/* 손님과 상품 */}
          <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
            <dl className="space-y-2.5 text-ink-body">
              <Row label="연락처">
                {order.phone ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular-nums">{order.phone}</span>
                    {phone && <a href={`tel:${phone}`} className="link-underline text-[13px] text-forest">전화</a>}
                    <button type="button" onClick={() => void copyText(order.phone!, '연락처')} className="link-underline text-[13px] text-slate">복사</button>
                  </span>
                ) : '-'}
              </Row>
              <Row label="수령">{DELIVERY_LABEL[delivery]}</Row>
              {delivery === 'parcel' && (
                <Row label="주소">
                  <span className="break-keep">{address}</span>{' '}
                  {order.address && (
                    <button type="button" onClick={() => void copyText(address, '주소')} className="link-underline text-[13px] text-slate">복사</button>
                  )}
                </Row>
              )}
              {order.note && <Row label="메모">{order.note}</Row>}
              {order.email && <Row label="이메일">{order.email}</Row>}
            </dl>
            <div>
              <p className="label-ko mb-2 text-muted-foreground">주문 상품</p>
              <ul className="space-y-1">
                {(order.items ?? []).map((item, i) => (
                  <li key={i} className="flex justify-between gap-3 text-[13px] text-ink-body">
                    <span className="min-w-0">{orderItemLabel(item)} ×{item.quantity}</span>
                    <span className="tabular-nums text-forest">₩&nbsp;{(item.price * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t border-border pt-2 text-[13px] font-medium text-ink">
                <span>합계</span>
                <span className="tabular-nums">₩&nbsp;{order.total_price.toLocaleString()}</span>
              </p>
            </div>
          </div>

          {/* 다음 할 일 */}
          {open && (
            <section aria-label="다음 할 일" className="space-y-3 rounded-md bg-muted/40 p-4">
              {showsTracking && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[12rem_1fr]">
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
                </div>
              )}

              {next && <p className="text-[13px] text-slate">{stepHint(order, delivery)}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {next && (
                  <button type="button" onClick={advance} disabled={busy !== null} className={`btn-primary ${BTN_SM}`}>
                    {busy === 'status' ? '처리 중…' : next.label}
                  </button>
                )}
                {showsTracking && order.status === 'shipped' && trackingDirty && (
                  <button
                    type="button"
                    onClick={() => void update(trackingBody(), '송장을 저장했습니다.', 'tracking')}
                    disabled={busy !== null}
                    className={`btn-outline ${BTN_SM}`}
                  >
                    {busy === 'tracking' ? '저장 중…' : '송장 저장'}
                  </button>
                )}
                {next?.status === 'shipped' && order.email && (
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate">
                    <input type="checkbox" className={CHECKBOX_CLASS} checked={notify} onChange={e => setNotify(e.target.checked)} />
                    배송 안내 메일도 보내기
                  </label>
                )}
                <button type="button" onClick={() => void cancel()} disabled={busy !== null} className={`btn-ghost ${BTN_SM} ml-auto text-brick`}>
                  주문 취소
                </button>
              </div>

              {/* 손님에게 보낼 문자. 이메일을 받지 않으므로 운영자가 보낸다. */}
              {sms && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="label-ko text-muted-foreground">손님에게 보낼 문자</p>
                  <p className="rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-ink-body">{sms}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyText(sms, '문자 내용')} className={`btn-outline ${BTN_SM}`}>
                      복사
                    </button>
                    {phone && (
                      <a href={smsHref(phone, sms)} className={`btn-outline ${BTN_SM}`}>
                        문자 앱으로 열기
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 관리자 메모 */}
          <div className="space-y-2">
            <label htmlFor={`order-${order.id}-memo`} className={LABEL_CLASS}>관리자 메모 (손님에게 보이지 않음)</label>
            <textarea
              id={`order-${order.id}-memo`}
              rows={2}
              className={INPUT_CLASS}
              value={memo}
              disabled={migrationPending}
              onChange={e => setMemo(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void update({ admin_memo: memo }, '메모를 저장했습니다.', 'memo')}
                disabled={!memoDirty || busy !== null}
                className={`btn-outline ${BTN_SM}`}
              >
                {busy === 'memo' ? '저장 중…' : '메모 저장'}
              </button>
            </div>
          </div>

          {/* 이메일이 있는 옛 주문만 메일을 다시 보낼 수 있다. */}
          {order.email && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <span className="label-ko mr-1 text-muted-foreground">안내 메일 다시 보내기</span>
              <button type="button" onClick={() => void resend('confirmation')} disabled={busy !== null} className={`btn-outline ${BTN_SM}`}>
                주문 확인
              </button>
              {delivery === 'parcel' && (
                <button
                  type="button"
                  onClick={() => void resend('shipping')}
                  disabled={busy !== null || !order.tracking_number}
                  title={order.tracking_number ? undefined : '송장번호를 저장하면 보낼 수 있습니다'}
                  className={`btn-outline ${BTN_SM}`}
                >
                  배송 안내
                </button>
              )}
            </div>
          )}

          <StatusLine message={message} />
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
