import { describe, expect, it } from 'vitest';
import { deliveryMethodFromRow, deliveryMethodOf, noteWithPickupTag } from '@/lib/delivery';

describe('delivery', () => {
  it('모르는 값과 빈 값은 택배다 — 컬럼 전의 주문은 전부 택배였다', () => {
    expect(deliveryMethodOf('pickup')).toBe('pickup');
    expect(deliveryMethodOf('parcel')).toBe('parcel');
    expect(deliveryMethodOf(undefined)).toBe('parcel');
    expect(deliveryMethodOf('drone')).toBe('parcel');
  });

  it('컬럼이 없을 때의 대면 전달은 메모 앞 표시로 남고, 그 표시로 다시 읽힌다', () => {
    expect(noteWithPickupTag(null)).toBe('[대면 전달]');
    expect(noteWithPickupTag('주말 오후')).toBe('[대면 전달] 주말 오후');
    expect(deliveryMethodFromRow({ note: noteWithPickupTag('주말') })).toBe('pickup');
    expect(deliveryMethodFromRow({ note: '문 앞' })).toBe('parcel');
    // 컬럼 값이 있으면 그것이 이긴다.
    expect(deliveryMethodFromRow({ delivery_method: 'parcel', note: '[대면 전달] x' })).toBe('parcel');
  });
});
