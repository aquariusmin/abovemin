import { describe, expect, it } from 'vitest';
import {
  availabilityProblem,
  isAvailable,
  isListed,
  optionsMinPrice,
  parseImages,
  parseOptions,
  priceRange,
  productStatus,
  publicState,
  syncedColumns,
  type ProductOption,
} from '@/lib/product';

/**
 * 이 파일이 지키는 것: "보이는가 / 살 수 있는가"의 판정이 한 가지로만 읽힌다.
 * 목록·상세·sitemap·홈·주문 API가 모두 이 함수들을 부르므로, 여기서 틀리면
 * 초안이 새거나 품절 상품이 주문된다.
 */

const option = (patch: Partial<ProductOption> = {}): ProductOption => ({
  id: 'a3',
  label: 'A3 · 매트지',
  price: 38000,
  in_stock: true,
  ...patch,
});

describe('productStatus()', () => {
  it('저장된 상태가 있으면 그것을 쓴다', () => {
    expect(productStatus({ status: 'sold_out', in_stock: true, price: 1000 })).toBe('sold_out');
    expect(productStatus({ status: 'draft', in_stock: true, price: 1000 })).toBe('draft');
  });

  it('마이그레이션 전(status 없음)에는 backfill과 같은 규칙으로 계산한다', () => {
    expect(productStatus({ in_stock: true, price: 12000 })).toBe('available');
    // 지금의 자리표시자(₩0 · 품절)는 품절이 아니라 초안이다 — 판 적이 없다.
    expect(productStatus({ in_stock: false, price: 0 })).toBe('draft');
    expect(productStatus({ in_stock: true, price: 0 })).toBe('draft');
    expect(productStatus({ in_stock: false, price: 12000 })).toBe('draft');
    expect(productStatus({ status: null, in_stock: true, price: 12000 })).toBe('available');
  });

  it('모르는 값은 저장된 상태로 믿지 않는다', () => {
    expect(productStatus({ status: 'archived', in_stock: false, price: 0 })).toBe('draft');
  });
});

describe('publicState() / isListed() / isAvailable()', () => {
  it('초안은 목록에 없다', () => {
    const draft = { status: 'draft', in_stock: false, price: 30000 };
    expect(isListed(draft)).toBe(false);
    expect(isAvailable(draft)).toBe(false);
  });

  it('품절은 목록에 남지만 살 수 없다', () => {
    const soldOut = { status: 'sold_out', in_stock: false, price: 30000 };
    expect(isListed(soldOut)).toBe(true);
    expect(isAvailable(soldOut)).toBe(false);
  });

  it('판매 중이어도 0원이면 초안처럼 숨긴다', () => {
    expect(publicState({ status: 'available', in_stock: true, price: 0 })).toBe('draft');
  });

  it('옵션 상품은 살 수 있는 옵션이 하나라도 있어야 판매 중이다', () => {
    const base = { status: 'available', in_stock: true, price: 0 };
    expect(publicState({ ...base, options: [option(), option({ id: 'a2', in_stock: false })] })).toBe('available');
    // 옵션 재고만 전부 껐다 → 품절로 보인다(상품 상태를 깜빡해도 담기가 살아 있지 않게).
    expect(publicState({ ...base, options: [option({ in_stock: false })] })).toBe('sold_out');
    // 가격이 정해진 옵션이 하나도 없다 → 보여 줄 것이 없다.
    expect(publicState({ ...base, options: [option({ price: 0 })] })).toBe('draft');
  });

  it('예전 호출(재고·가격만)도 그대로 동작한다', () => {
    expect(isAvailable({ in_stock: true, price: 12000 })).toBe(true);
    expect(isAvailable({ in_stock: true, price: 0 })).toBe(false);
  });
});

describe('parseImages()', () => {
  it('비어 있으면 image_url 한 장으로 채운다', () => {
    expect(parseImages([], 'https://x/cover.jpg')).toEqual([{ url: 'https://x/cover.jpg', label: null }]);
    expect(parseImages(null, 'https://x/cover.jpg')).toEqual([{ url: 'https://x/cover.jpg', label: null }]);
    expect(parseImages(undefined, '')).toEqual([]);
  });

  it('모양이 틀린 항목은 버리고, 설명은 다듬는다', () => {
    const parsed = parseImages(
      [
        { url: 'https://x/1.jpg', label: ' 앞면 ' },
        { url: '', label: '빈 주소' },
        'https://x/2.jpg',
        { url: 'https://x/3.jpg', label: 42 },
        { url: 'https://x/4.jpg', label: 'ㄱ'.repeat(50) },
      ],
      'https://x/cover.jpg',
    );
    expect(parsed).toEqual([
      { url: 'https://x/1.jpg', label: '앞면' },
      { url: 'https://x/3.jpg', label: null },
      { url: 'https://x/4.jpg', label: 'ㄱ'.repeat(40) },
    ]);
  });
});

describe('parseOptions()', () => {
  it('형식이 틀린 id, 빈 이름, 음수·소수 가격, 중복 id를 버린다', () => {
    const parsed = parseOptions([
      option(),
      option({ id: 'a3', label: '중복' }),
      option({ id: 'Bad Id' }),
      option({ id: 'x:y' }),
      option({ id: 'blank', label: '  ' }),
      option({ id: 'neg', price: -1 }),
      option({ id: 'frac', price: 10.5 }),
      { id: 'no-stock-flag', label: 'A2', price: 50000 },
    ]);
    expect(parsed.map(o => o.id)).toEqual(['a3', 'no-stock-flag']);
    // in_stock이 true가 아니면 품절로 읽는다 — 모르면 팔지 않는다.
    expect(parsed[1].in_stock).toBe(false);
  });

  it('배열이 아니면 빈 목록', () => {
    expect(parseOptions({ id: 'a3' })).toEqual([]);
    expect(parseOptions('[]')).toEqual([]);
  });
});

describe('priceRange() / optionsMinPrice()', () => {
  it('옵션이 없으면 상품 가격 하나', () => {
    expect(priceRange({ price: 30000 })).toEqual({ min: 30000, max: 30000 });
  });

  it('살 수 있는 옵션의 범위', () => {
    const options = [option({ price: 58000 }), option({ id: 'a4', price: 22000, in_stock: false }), option({ id: 'a3m', price: 38000 })];
    expect(priceRange({ price: 22000, options })).toEqual({ min: 38000, max: 58000 });
    // 저장용 최저가는 재고와 무관하게 가격이 정해진 옵션 전체에서.
    expect(optionsMinPrice(options)).toBe(22000);
  });

  it('전부 품절이면 가격이 정해진 옵션 전체의 범위', () => {
    const options = [option({ price: 58000, in_stock: false }), option({ id: 'a4', price: 0 })];
    expect(priceRange({ price: 0, options })).toEqual({ min: 58000, max: 58000 });
    expect(optionsMinPrice([option({ price: 0 })])).toBe(0);
  });
});

describe('availabilityProblem() / syncedColumns()', () => {
  it('판매 중으로 두려면 팔 가격이 있어야 한다', () => {
    expect(availabilityProblem({ status: 'available', price: 0, options: [] })).not.toBeNull();
    expect(availabilityProblem({ status: 'available', price: 1000, options: [] })).toBeNull();
    expect(availabilityProblem({ status: 'available', price: 0, options: [option({ in_stock: false })] })).not.toBeNull();
    expect(availabilityProblem({ status: 'available', price: 0, options: [option()] })).toBeNull();
    // 초안·품절은 가격이 없어도 저장된다.
    expect(availabilityProblem({ status: 'draft', price: 0, options: [] })).toBeNull();
    expect(availabilityProblem({ status: 'sold_out', price: 0, options: [] })).toBeNull();
  });

  it('호환 컬럼: 옵션 최저가, 첫 이미지, 상태에서 온 in_stock', () => {
    expect(
      syncedColumns({
        status: 'available',
        price: 99999,
        options: [option({ price: 58000 }), option({ id: 'a4', price: 22000 })],
        images: [{ url: 'https://x/front.jpg', label: '앞면' }, { url: 'https://x/back.jpg', label: '뒷면' }],
        image_url: 'https://x/old.jpg',
      }),
    ).toEqual({ price: 22000, image_url: 'https://x/front.jpg', in_stock: true });

    expect(
      syncedColumns({ status: 'sold_out', price: 30000, options: [], images: [], image_url: 'https://x/old.jpg' }),
    ).toEqual({ price: 30000, image_url: 'https://x/old.jpg', in_stock: false });
  });
});
