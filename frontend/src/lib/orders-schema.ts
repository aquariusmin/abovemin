import { z } from 'zod';
import { OPTION_ID_RE } from './product';

/**
 * 주문 요청의 형태. **체크아웃 폼과 API가 이 파일 하나를 같이 본다.**
 *
 * 예전에는 스키마가 라우트 안에만 있었고, 그래서 폼은 `zipcode`를 보내는데
 * 스키마는 그런 필드를 모르는 상태가 생겼다. zod는 모르는 키를 조용히
 * 버리므로(기본이 strip) 아무도 그것을 알아차리지 못했고, 우편번호는 DB에도
 * 주문 메일에도 들어가지 않은 채 몇 달을 갔다.
 *
 * 밖으로 꺼낸 것만으로는 그 일이 다시 안 일어난다는 보장이 없다. 진짜 잠금은
 * 체크아웃이 보낼 본문을 `OrderInputValues`로 **타입 지정**하는 것이다 —
 * 객체 리터럴에 스키마가 모르는 키가 있으면 TypeScript가 거기서 막는다.
 * 런타임 테스트는 그 뒤를 받친다(`orders-schema.test.ts`).
 */
export const OrderItemInput = z.object({
  id: z.number().int().positive(),
  /**
   * 옵션이 있는 상품이면 고른 옵션의 id. **가격은 받지 않는다** — 서버가 이
   * id로 `products.options`에서 가격을 다시 읽는다(`lib/order-items.ts`).
   * 옵션이 생기기 전의 장바구니는 이 키 없이 오므로 optional이다.
   */
  option_id: z.string().regex(OPTION_ID_RE).nullable().optional(),
  quantity: z.number().int().positive().max(99),
});

export const OrderInput = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  zipcode: z.string().max(20).optional().nullable(),
  address: z.string().min(1).max(500),
  note: z.string().max(1000).optional().nullable(),
  items: z.array(OrderItemInput).min(1).max(50),
  /**
   * 허니팟. 체크아웃 폼에는 화면·보조기기·탭 순서 어디에도 드러나지 않는
   * 입력으로 있다 — 사람은 비워 두고, 폼을 통째로 채우는 봇은 채운다. 채워져
   * 오면 API는 저장도 메일도 없이 성공한 척만 한다(`isHoneypotFilled`).
   * 스키마가 이 키를 알아야 strip되지 않고 서버까지 온다.
   */
  website: z.string().max(200).optional().nullable(),
  /**
   * 주문 시도 하나에 하나. 체크아웃이 만들고, 같은 제출을 다시 보낼 때도 같은
   * 값을 보낸다 — 서버는 이 키로 이미 들어온 주문이 있으면 새로 넣지 않고 그
   * 주문으로 답한다(`api/orders`). 구버전 탭은 키 없이 오므로 optional.
   */
  idempotency_key: z.string().uuid().optional().nullable(),
});

/** 허니팟에 뭔가 들어 있으면 봇이다 — 공백 한 칸이라도. 사람은 이 칸을 볼 수 없다. */
export function isHoneypotFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.length > 0;
}

/** 클라이언트가 조립해 보내는 본문의 타입. */
export type OrderInputValues = z.input<typeof OrderInput>;
