"use client";

/** 끝에 닿은 버튼은 `disabled`가 아니라 `aria-disabled` + 이른 return — 포커스가 <body>로 떨어지지 않게. */
const QTY_BUTTON =
  'group -m-0.5 flex h-10 w-10 items-center justify-center aria-disabled:cursor-not-allowed focus-visible:outline-none!';
const QTY_BUTTON_FACE =
  'flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-lg leading-none text-slate transition-colors group-hover:border-accent group-hover:text-accent group-aria-disabled:opacity-40 group-aria-disabled:group-hover:border-hairline group-aria-disabled:group-hover:text-slate group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring';

interface Props {
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
