/**
 * 홈 화면의 크리스마스 장식. 겨울 장식 기간에만 그려진다(`lib/season.ts`).
 * 전부 장식이라 `aria-hidden`이고 클릭을 막지 않는다. 움직임(전구 반짝임,
 * 오너먼트 흔들림)은 CSS 애니메이션이라 "동작 줄이기"면 멈춘다(`globals.css`의
 * reduced-motion 규칙).
 *
 *  - `Lights`  — 늘어진 전선에 매달린 전구 줄. 칸(56px)을 넉넉히 늘어놓고 넘치는
 *    쪽은 잘라 어느 폭에서나 전구 크기가 같다. `dark`는 짙은 띠 위에서 불빛이
 *    번져 보이게 한다.
 *  - `Baubles` — 히어로 오른쪽 위 빈자리에 매달린 오너먼트 공 세 개. 폰에서는
 *    사진 위로 내려오므로 그리지 않는다(`md`부터).
 *  - `Holly`   — 섹션 제목 옆의 작은 호랑가시 잎과 열매.
 */

const BULB_COLORS = ['var(--brick)', 'var(--bulb-gold)', 'var(--moss)', 'var(--cream)'];
const BULB_COUNT = 48;

export function Lights({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[34px] overflow-hidden ${dark ? 'winter-lights-dark' : ''} ${className}`}
    >
      {Array.from({ length: BULB_COUNT }, (_, i) => (
        <svg key={i} width="56" height="34" viewBox="0 0 56 34" className="shrink-0 overflow-visible">
          <path
            d="M0 3 Q28 15 56 3"
            fill="none"
            stroke={dark ? 'var(--cream)' : 'var(--forest)'}
            strokeOpacity={dark ? 0.35 : 0.55}
            strokeWidth="1.2"
          />
          <rect x="25.5" y="8" width="5" height="4" rx="1" fill={dark ? 'var(--cream-deep)' : 'var(--forest)'} />
          <g className="winter-bulb" style={{ animationDelay: `${(i * 0.37) % 2.4}s`, color: BULB_COLORS[i % BULB_COLORS.length] }}>
            <ellipse cx="28" cy="19" rx="5" ry="7" fill="currentColor" />
            <ellipse cx="26.4" cy="16.6" rx="1.4" ry="2.4" fill="white" fillOpacity="0.55" />
          </g>
        </svg>
      ))}
    </div>
  );
}

const BAUBLES = [
  { right: '18%', length: 54, r: 12, color: 'var(--brick)', delay: '0s' },
  { right: '11%', length: 96, r: 16, color: 'var(--forest)', delay: '-1.2s' },
  { right: '4%', length: 70, r: 11, color: 'var(--bulb-gold)', delay: '-0.6s' },
];

export function Baubles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-0 md:block">
      {BAUBLES.map(b => (
        <svg
          key={b.right}
          className="winter-bauble absolute top-[10px]"
          style={{ right: b.right, animationDelay: b.delay }}
          width={b.r * 2 + 4}
          height={b.length + b.r * 2 + 6}
          viewBox={`0 0 ${b.r * 2 + 4} ${b.length + b.r * 2 + 6}`}
        >
          <line x1={b.r + 2} y1="0" x2={b.r + 2} y2={b.length} stroke="var(--forest)" strokeOpacity="0.5" strokeWidth="1" />
          <rect x={b.r - 2} y={b.length - 1} width="8" height="6" rx="1.5" fill="var(--bulb-gold)" />
          <circle cx={b.r + 2} cy={b.length + 5 + b.r} r={b.r} fill={b.color} />
          <circle cx={b.r + 2 - b.r * 0.35} cy={b.length + 5 + b.r * 0.6} r={b.r * 0.28} fill="white" fillOpacity="0.45" />
          <path
            d={`M${2} ${b.length + 5 + b.r} Q${b.r + 2} ${b.length + 5 + b.r * 1.35} ${b.r * 2 + 2} ${b.length + 5 + b.r}`}
            fill="none"
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </div>
  );
}

export function Holly({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 24" className={`inline-block h-[0.7em] w-auto align-[0.05em] ${className}`}>
      <path d="M15 13 C10 4 4 6 1 9 C4 10 4 13 2 15 C6 14 8 17 9 19 C10 16 13 15 15 13Z" fill="var(--fern)" />
      <path d="M17 13 C22 4 28 6 31 9 C28 10 28 13 30 15 C26 14 24 17 23 19 C22 16 19 15 17 13Z" fill="var(--forest)" />
      <circle cx="13.5" cy="14.5" r="3" fill="var(--brick)" />
      <circle cx="18.5" cy="14.5" r="3" fill="var(--brick)" />
      <circle cx="16" cy="10.5" r="3" fill="var(--brick)" />
      <circle cx="15.2" cy="9.6" r="0.9" fill="white" fillOpacity="0.6" />
    </svg>
  );
}
