import { z } from 'zod';

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
});

/** 클라이언트가 조립해 보내는 본문의 타입. */
export type OrderInputValues = z.input<typeof OrderInput>;
