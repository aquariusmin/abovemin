"use client";

/**
 * 수량 − / 숫자 / +. 장바구니 줄과 상품 페이지의 추가 상품이 같이 쓴다.
 *
 * 터치 영역은 40px, 보이는 모양은 36px이다: 버튼 자체가 40px이고 테두리 있는
 * 36px 면은 안쪽 <span>이 그린다. 바깥 2px은 음수 마진으로 되돌려, 줄 안에서
 * 차지하는 자리는 36px 버튼과 같다. 포커스 링도 보이는 면에 둔다(전역
 * `:focus-visible`과 같은 2px `--ring`).
 *
 * 끝에 닿은 버튼은 `disabled`가 아니라 `aria-disabled` + 이른 return이다. 1까지
 * 줄이는 순간 누르고 있던 버튼이 disabled가 되면 포커스가 <body>로 떨어져,
 * 키보드로는 옆의 "+"조차 다시 찾아가야 했다. aria-disabled는 포커스를 남긴 채
 * "사용할 수 없음"만 알린다.
 */
const QTY_BUTTON =
  'group -m-0.5 flex h-10 w-10 items-center justify-center aria-disabled:cursor-not-allowed focus-visible:outline-none!';
const QTY_BUTTON_FACE =
  'flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-lg leading-none text-slate transition-colors group-hover:border-accent group-hover:text-accent group-aria-disabled:opacity-40 group-aria-disabled:group-hover:border-hairline group-aria-disabled:group-hover:text-slate group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring';

interface Props {
  /** 무엇의 수량인지 — 버튼 이름과 읽어 주는 문장에 붙는다. */
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  className?: string;
}

export default function QuantityStepper({ name, value, min, max, onChange, className = '' }: Props) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => { if (!atMin) onChange(value - 1); }}
        aria-disabled={atMin}
        aria-label={`${name} 수량 줄이기`}
        className={QTY_BUTTON}
      >
        <span aria-hidden className={QTY_BUTTON_FACE}>−</span>
      </button>
      {/* 바뀐 수량을 읽어 준다. 숫자만 들리지 않도록 이름을 숨겨 붙인다. */}
      <span role="status" className="text-sm font-semibold w-6 text-center tabular-nums">
        <span className="sr-only">{name} 수량 </span>
        {value}
      </span>
      <button
        type="button"
        onClick={() => { if (!atMax) onChange(value + 1); }}
        aria-disabled={atMax}
        aria-label={`${name} 수량 늘리기`}
        className={QTY_BUTTON}
      >
        <span aria-hidden className={QTY_BUTTON_FACE}>+</span>
      </button>
    </div>
  );
}
