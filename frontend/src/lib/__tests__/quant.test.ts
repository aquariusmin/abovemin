import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  books, dayTicks, fmtDateKst, fmtDateTimeKst, fmtDayKst, fmtPct,
  lastCycle, parseBotName, parseEquityCurve, staleness, type FleetBot,
} from '@/lib/quant';

afterEach(() => vi.useRealTimers());

/**
 * 이 파일들이 파싱하는 문자열은 NAS의 `sync_dashboard.py`가 만든다. 그쪽 형식이
 * 바뀌면 여기가 먼저 깨져야 한다 — 콘솔이 조용히 "—"만 그리는 것보다 낫다.
 */
describe('parseBotName()', () => {
  it('태그·전략·거래소·정지 상태를 분해한다', () => {
    expect(parseBotName('NASDAQ100 / scanner [TOSS·REAL] ⛔ HALTED(daily)')).toEqual({
      tag: 'NASDAQ100', strategy: 'scanner', venue: 'TOSS·REAL',
      real: true, halted: true, haltKind: 'daily',
    });
  });

  it('모의 계좌를 실자금으로 읽지 않는다', () => {
    // 이 한 글자가 종이 수익과 실제 손실을 가른다.
    expect(parseBotName('BTC / vb [KIS-MOCK]').real).toBe(false);
    expect(parseBotName('BTC / vb [KIS]').real).toBe(true);
    expect(parseBotName('BTC / vb').venue).toBeNull();
  });

  it('태그 안의 슬래시에 속지 않는다', () => {
    // 마지막 " / "로 잘라야 "BTC/USDT"가 살아남는다.
    const p = parseBotName('BTC/USDT / vb_entry55_exit20');
    expect(p.tag).toBe('BTC/USDT');
    expect(p.strategy).toBe('vb_entry55_exit20');
  });
});

describe('parseEquityCurve()', () => {
  it('ISO 문자열과 epoch를 모두 받는다', () => {
    expect(parseEquityCurve('[["2026-09-12T00:00:00Z", 100]]')[0].equity).toBe(100);
    expect(parseEquityCurve('[[1757635200000, 42]]')[0].ts).toBe(1757635200000);
  });

  it('깨진 행은 차트를 없애되 대시보드를 죽이지 않는다', () => {
    expect(parseEquityCurve('not json')).toEqual([]);
    expect(parseEquityCurve(null)).toEqual([]);
  });
});

describe('KST 날짜', () => {
  // 콘솔이 다루는 계좌가 전부 한국 시장이라, UTC로 찍으면 장 시작 시간대가
  // 통째로 전날로 밀린다. 이 세 테스트가 그 회귀를 막는다.
  const kstMorning = Date.parse('2026-09-11T21:30:00Z'); // = 09-12 06:30 KST

  it('자정~오전 9시 KST를 전날로 밀지 않는다', () => {
    expect(fmtDateKst(kstMorning)).toBe('09/12');
    expect(fmtDayKst(kstMorning)).toBe('2026-09-12');
    expect(fmtDateTimeKst(kstMorning)).toBe('2026-09-12 06:30');
  });

  it('UTC와 KST가 같은 날인 시각도 맞다', () => {
    expect(fmtDayKst(Date.parse('2026-09-12T04:00:00Z'))).toBe('2026-09-12');
  });
});

describe('dayTicks()', () => {
  const day = 86_400_000;
  const base = Date.parse('2026-09-01T03:00:00Z'); // 09-01 12:00 KST

  it('하루에 눈금 하나만 남긴다', () => {
    // 같은 날의 두 지점이 함께 뽑히면 축에 같은 라벨이 두 번 찍혔다.
    const stamps = [base, base + 3600_000, base + 7200_000, base + day];
    const ticks = dayTicks(stamps);
    expect(ticks).toHaveLength(2);
    expect(ticks.map(fmtDayKst)).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('라벨이 절대 중복되지 않는다', () => {
    const stamps = Array.from({ length: 90 }, (_, i) => base + i * day);
    const labels = dayTicks(stamps).map(fmtDateKst);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('길어져도 상한을 지키고 마지막 날은 항상 남긴다', () => {
    const stamps = Array.from({ length: 90 }, (_, i) => base + i * day);
    const ticks = dayTicks(stamps, 8);
    expect(ticks.length).toBeLessThanOrEqual(9); // 솎은 8개 + 마지막
    expect(ticks.at(-1)).toBe(stamps.at(-1));
  });

  it('빈 입력에도 터지지 않는다', () => {
    expect(dayTicks([])).toEqual([]);
  });
});

describe('staleness()', () => {
  it('마지막 사이클 기준으로 살았는지 판단한다', () => {
    const now = Date.parse('2026-09-12T00:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(staleness(now - 1 * 3600_000)).toBe('live');
    expect(staleness(now - 48 * 3600_000)).toBe('lagging');
    expect(staleness(now - 200 * 3600_000)).toBe('stale');
    expect(staleness('garbage')).toBe('stale');
  });
});

describe('lastCycle()', () => {
  it('곡선의 마지막 점을 쓰고, 없으면 동기화 시각으로 떨어진다', () => {
    const ts = Date.parse('2026-09-11T00:00:00Z');
    expect(lastCycle([{ ts, equity: 1 }], '2026-09-12T00:00:00Z')).toBe(ts);
    expect(lastCycle([], '2026-09-12T00:00:00Z')).toBe(Date.parse('2026-09-12T00:00:00Z'));
  });
});

describe('books()', () => {
  const bot = (over: Partial<FleetBot>): FleetBot => ({
    id: 'x', bot_name: 'T / s', strategy: 's', market: 'stock', equity: 100,
    pnl_pct: 0, position_pct: null, holdings_count: null, holdings: null,
    fills_count: null, last_fill: null, cash: null, currency: 'USD', mark: null,
    equity_curve: null, updated_at: '2026-09-12T00:00:00Z', ...over,
  });

  it('실자금과 모의를 절대 한 칸에 합치지 않는다', () => {
    const { real, sim } = books([
      bot({ id: 'a', bot_name: 'A / s [TOSS·REAL]', equity: 1000 }),
      bot({ id: 'b', bot_name: 'B / s [KIS-MOCK]', equity: 5000 }),
    ]);
    expect(real.map(b => b.equity)).toEqual([1000]);
    expect(sim.map(b => b.equity)).toEqual([5000]);
  });

  it('통화가 다르면 칸도 나뉜다', () => {
    const { real } = books([
      bot({ id: 'a', bot_name: 'A / s [KIS]', equity: 100, currency: 'USD' }),
      bot({ id: 'b', bot_name: 'B / s [KIS]', equity: 200, currency: 'KRW' }),
    ]);
    expect(real).toHaveLength(2);
    expect(real.map(b => b.currency).sort()).toEqual(['KRW', 'USD']);
  });
});

describe('fmtPct()', () => {
  it('양수에 부호를 붙이고 없는 값은 대시로 둔다', () => {
    expect(fmtPct(24.375)).toBe('+24.38%');
    expect(fmtPct(-3)).toBe('-3.00%');
    expect(fmtPct(null)).toBe('—');
  });
});
