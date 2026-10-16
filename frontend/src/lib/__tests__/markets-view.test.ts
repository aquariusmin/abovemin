import { describe, expect, it } from 'vitest';
import {
  fmtPct, freshness, liveRecord, marketParam, regimeKo, regimeTone, sliceRange, sma, validationLabel,
} from '@/lib/markets/view';
import { objectPath, tokenMatches, uploadSchema } from '@/lib/markets/ingest';
import type { ForecastHistoryRow } from '@/lib/markets/types';

const days = (n: number, start = '2026-01-01'): [string, number][] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.parse(start) + i * 86_400_000).toISOString().slice(0, 10);
    return [d, 100 + i] as [string, number];
  });

describe('시장 표시 규칙', () => {
  it('검증을 통과하지 못한 확률은 "신뢰할 수 없음"으로 표시한다', () => {
    expect(validationLabel('validated')).toEqual({ text: '검증 통과', tone: 'good' });
    expect(validationLabel('not_validated').text).toBe('신뢰할 수 없음');
    expect(validationLabel(undefined).text).toBe('검증 없음');
  });

  it('국면 이름과 톤', () => {
    expect(regimeKo('Bearish / High Volatility')).toBe('하락 · 높은 변동성');
    expect(regimeKo(undefined)).toBe('판정 없음');
    expect(regimeTone('Bullish / Low Volatility')).toBe('good');
    expect(regimeTone('Bearish / High Volatility')).toBe('critical');
    expect(regimeTone('Sideways / Neutral')).toBe('neutral');
  });

  it('퍼센트 표기는 없는 값을 지어내지 않는다', () => {
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(Number.NaN)).toBe('—');
    expect(fmtPct(0.4214, 0, { ratio: true })).toBe('42%');
    expect(fmtPct(1.5, 1, { signed: true })).toBe('+1.5%');
  });

  it('주소의 시장 값은 허용 목록만 받는다', () => {
    expect(marketParam('nq')).toBe('nq');
    expect(marketParam(['sp', 'ks'])).toBe('sp');
    expect(marketParam('drop table')).toBe('ks');
    expect(marketParam(undefined)).toBe('ks');
  });

  it('신선도: 20시간 이내 정상, 3일 넘으면 경고', () => {
    const now = Date.parse('2026-10-16T12:00:00Z');
    expect(freshness('2026-10-16T00:00:00Z', now).tone).toBe('good');
    expect(freshness('2026-10-14T00:00:00Z', now).tone).toBe('warning');
    expect(freshness('2026-10-01T00:00:00Z', now).tone).toBe('critical');
    expect(freshness(null, now).hours).toBeNull();
  });
});

describe('차트 계산', () => {
  it('기간은 마지막 종가 기준으로 자른다', () => {
    const rows = days(400);
    const cut = sliceRange(rows, '3M');
    expect(cut[cut.length - 1]).toEqual(rows[rows.length - 1]);
    expect(cut.length).toBe(93);
    expect(sliceRange([], '1Y')).toEqual([]);
  });

  it('이동평균은 n개가 모이기 전에는 비워 둔다', () => {
    const out = sma(days(5), 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(101);
    expect(out[4]).toBe(103);
  });
});

describe('실시간 예측 성적', () => {
  const row = (over: Partial<ForecastHistoryRow>): ForecastHistoryRow => ({
    id: 1, created_at: '', market: 'nq', horizon: 1, model_name: 'm', input_cutoff: '2026-10-14',
    p_bull: 0.5, p_neutral: 0.3, p_bear: 0.2, ...over,
  });
  it('늦게 기록된 예측은 적중으로 세지 않는다', () => {
    const rec = liveRecord([
      row({ status: 'evaluated', hit: true }),
      row({ status: 'evaluated', hit: false }),
      row({ status: 'evaluated', hit: true, late: true }),
      row({ status: 'pending' }),
      row({ status: 'evaluated', hit: true, market: 'ks' }),
      row({ status: 'evaluated', hit: true, horizon: 5 }),
    ], 'nq', '1');
    expect(rec).toEqual({ evaluated: 2, hits: 1, late: 1, pending: 1 });
  });
});

describe('업로드 계약', () => {
  const token = 'x'.repeat(40);
  it('토큰은 정확히 일치해야 하고 짧은 토큰은 설정 자체를 거부한다', () => {
    expect(tokenMatches(`Bearer ${token}`, token)).toBe(true);
    expect(tokenMatches(`Bearer ${token}y`, token)).toBe(false);
    expect(tokenMatches(token, token)).toBe(false);
    expect(tokenMatches(null, token)).toBe(false);
    expect(tokenMatches('Bearer short', 'short')).toBe(false);
    expect(tokenMatches(`Bearer ${token}`, undefined)).toBe(false);
  });

  it('스키마가 맞는 묶음만 받는다', () => {
    const core = { schema: 'mi-web/1', generated_at: '2026-10-16T00:00:00Z', markets: {} };
    expect(uploadSchema.safeParse({ schema: 'mi-web/1', files: { core, news: null, performance: {} } }).success).toBe(true);
    expect(uploadSchema.safeParse({ schema: 'mi-web/2', files: { core, news: null, performance: null } }).success).toBe(false);
    expect(uploadSchema.safeParse({ schema: 'mi-web/1', files: { core: { markets: {} }, news: null, performance: null } }).success).toBe(false);
    expect(uploadSchema.safeParse({ schema: 'mi-web/1', files: { core } }).success).toBe(false);
  });

  it('저장 경로는 고정된 세 파일뿐이다', () => {
    expect(objectPath('core')).toBe('v1/core.json');
  });
});
