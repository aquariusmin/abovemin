import { describe, expect, it, vi } from 'vitest';
import {
  isMissingColumnError,
  isMissingSchemaError,
  isMissingTableError,
  withColumnFallback,
} from '@/lib/db-compat';

/**
 * 이 파일이 지키는 것: 마이그레이션보다 코드가 먼저 배포돼도 공개 페이지가
 * 죽지 않는다. 그리고 **다른** 오류는 삼키지 않는다 — 네트워크 장애를 "컬럼이
 * 없나 보다"로 처리해 필터 없이 다시 읽으면 숨긴 사진이 새어 나간다.
 */
describe('isMissingColumnError', () => {
  it('Postgres undefined_column(42703)을 알아본다', () => {
    expect(isMissingColumnError({ code: '42703', message: 'column albums.published does not exist' })).toBe(true);
  });

  it('PostgREST 스키마 캐시 오류(PGRST204)를 알아본다', () => {
    expect(isMissingColumnError({ code: 'PGRST204', message: "Could not find the 'hidden' column" })).toBe(true);
  });

  it('코드가 비어 와도 문구로 알아본다', () => {
    expect(isMissingColumnError({ message: 'column photos.hidden does not exist' })).toBe(true);
  });

  it('다른 오류는 아니라고 한다', () => {
    for (const error of [
      { code: '42501', message: 'permission denied' },
      { code: 'PGRST116', message: 'no rows' },
      new Error('fetch failed'),
      null,
      undefined,
      'column x does not exist', // 문자열 자체는 오류 객체가 아니다
    ]) {
      expect(isMissingColumnError(error)).toBe(false);
    }
  });
});

describe('isMissingTableError', () => {
  it('Postgres undefined_table(42P01)과 PostgREST 스키마 캐시(PGRST205)를 알아본다', () => {
    expect(isMissingTableError({ code: '42P01', message: 'relation "public.places" does not exist' })).toBe(true);
    expect(
      isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.notes' in the schema cache" }),
    ).toBe(true);
  });

  it('코드가 비어 와도 문구로 알아본다', () => {
    expect(isMissingTableError({ message: 'relation "notes" does not exist' })).toBe(true);
    expect(isMissingTableError({ message: "Could not find the table 'public.places' in the schema cache" })).toBe(true);
  });

  it('컬럼 오류나 다른 오류는 테이블 오류가 아니다', () => {
    for (const error of [
      { code: '42703', message: 'column photos.width does not exist' },
      { code: 'PGRST204', message: "Could not find the 'width' column of 'photos' in the schema cache" },
      { code: '42501', message: 'permission denied for table notes' },
      null,
      'relation x does not exist',
    ]) {
      expect(isMissingTableError(error)).toBe(false);
    }
  });
});

describe('isMissingSchemaError', () => {
  it('컬럼·테이블 어느 쪽이 없어도 참, 그 밖의 오류는 거짓', () => {
    expect(isMissingSchemaError({ code: '42703' })).toBe(true);
    expect(isMissingSchemaError({ code: 'PGRST204' })).toBe(true);
    expect(isMissingSchemaError({ code: '42P01' })).toBe(true);
    expect(isMissingSchemaError({ code: 'PGRST205' })).toBe(true);
    expect(isMissingSchemaError({ code: '08006', message: 'connection failure' })).toBe(false);
    expect(isMissingSchemaError(new Error('fetch failed'))).toBe(false);
  });
});

describe('withColumnFallback', () => {
  it('첫 쿼리가 성공하면 fallback을 부르지 않는다', async () => {
    const fallback = vi.fn();
    const result = await withColumnFallback('t', async () => ({ data: [1], error: null }), fallback);
    expect(result).toEqual({ data: [1], error: null, migrationPending: false });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('컬럼이 없을 때만 한 번 더 읽고 migrationPending을 켠다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    type Response = { data: number[] | null; error: { code: string; message: string } | null };
    const result = await withColumnFallback<Response>(
      't',
      async () => ({ data: null, error: { code: '42703', message: 'column x does not exist' } }),
      async () => ({ data: [2], error: null }),
    );
    expect(result).toEqual({ data: [2], error: null, migrationPending: true });
    warn.mockRestore();
  });

  it('다른 오류는 그대로 돌려준다', async () => {
    const fallback = vi.fn();
    const error = { code: '08006', message: 'connection failure' };
    const result = await withColumnFallback('t', async () => ({ data: null, error }), fallback);
    expect(result.error).toBe(error);
    expect(result.migrationPending).toBe(false);
    expect(fallback).not.toHaveBeenCalled();
  });
});
