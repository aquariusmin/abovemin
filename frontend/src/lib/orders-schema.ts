import { z } from 'zod';
import { OPTION_ID_RE } from './product';
import { DELIVERY_METHODS } from './delivery';

// 체크아웃은 본문을 `OrderInputValues`로 타입 지정한다 — zod가 모르는 키를 조용히 strip하기 때문이다.
export const OrderItemInput = z
  .object({
    id: z.number().int().positive(),
    // 가격은 받지 않는다 — 서버가 `products.options`에서 다시 읽는다.
    option_id: z.string().regex(OPTION_ID_RE).nullable().optional(),
    // 추가 상품 id(`id`는 부모). 가격·이름은 받지 않고, 부모 줄 존재도 서버가 본다.
    addon_id: z.string().regex(OPTION_ID_RE).nullable().optional(),
    quantity: z.number().int().positive().max(99),
  })
  // 한 줄이 옵션과 추가 상품을 둘 다 가리키면 막는다.
  .refine(item => !(item.option_id && item.addon_id), '한 줄에 옵션과 추가 상품을 함께 보낼 수 없습니다.');

export const OrderInput = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().trim().min(1).max(40),
  zipcode: z.string().max(20).optional().nullable(),
  // 택배면 필수(아래 `superRefine`). `delivery_method`가 없으면 택배다.
  address: z.string().max(500),
  delivery_method: z.enum(DELIVERY_METHODS).optional(),
  note: z.string().max(1000).optional().nullable(),
  items: z.array(OrderItemInput).min(1).max(50),
  // 허니팟. 스키마가 이 키를 알아야 strip되지 않고 서버까지 온다.
  website: z.string().max(200).optional().nullable(),
  // 같은 제출 재시도는 같은 키 — 서버는 이 키로 이미 들어온 주문이 있으면 그 주문으로 답한다.
  idempotency_key: z.string().uuid().optional().nullable(),
}).superRefine((order, ctx) => {
  if ((order.delivery_method ?? 'parcel') === 'parcel' && order.address.trim() === '') {
    ctx.addIssue({ code: 'custom', path: ['address'], message: '택배로 받으려면 주소가 필요합니다.' });
  }
});

export function isHoneypotFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.length > 0;
}

export type OrderInputValues = z.input<typeof OrderInput>;
