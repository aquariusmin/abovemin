/**
 * 홈 맨 위의 전구 줄 — 크리스마스 장식. 겨울 장식 기간에만 그려진다.
 *
 * 한 칸(120px)에 늘어진 전선 두 굽이와 전구 두 개를 그린 SVG `<pattern>`을 가로로
 * 되풀이한다. 화면 폭이 바뀌어도 전구가 늘어나거나 찌그러지지 않고 개수만 바뀐다.
 * 히어로 사진 위 여백에 겹쳐 놓이며 클릭을 막지 않는다. 색은 사이트 팔레트의
 * 벽돌색과 연두색.
 */
export default function Garland() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22px] w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="garland-tile" width="120" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 3 Q30 13 60 3 Q90 13 120 3" fill="none" stroke="var(--forest)" strokeOpacity="0.55" strokeWidth="1" />
          <rect x="28.5" y="7" width="3" height="3" rx="0.6" fill="var(--forest)" />
          <ellipse cx="30" cy="14.5" rx="3.2" ry="4.6" fill="var(--brick)" />
          <ellipse cx="29" cy="13" rx="0.9" ry="1.6" fill="var(--cream)" fillOpacity="0.7" />
          <rect x="88.5" y="7" width="3" height="3" rx="0.6" fill="var(--forest)" />
          <ellipse cx="90" cy="14.5" rx="3.2" ry="4.6" fill="var(--moss)" />
          <ellipse cx="89" cy="13" rx="0.9" ry="1.6" fill="var(--cream)" fillOpacity="0.7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#garland-tile)" />
    </svg>
  );
}
