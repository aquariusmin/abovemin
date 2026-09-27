"use client";

import { MotionConfig } from 'framer-motion';

/**
 * 모든 framer-motion 컴포넌트가 OS의 "동작 줄이기" 설정을 따르게 한다.
 *
 * `reducedMotion="user"`면 framer가 transform(y·x·scale) 애니메이션을 건너뛰고
 * 불투명도 같은 나머지만 움직인다 — 내용은 그대로 보인다. 컴포넌트마다 감싸면
 * 새 컴포넌트를 만들 때 빠뜨리기 쉬워서(ShopCatalog가 그랬다), 루트 레이아웃에서
 * 한 번 건다. 루트 레이아웃은 서버 컴포넌트라 이 얇은 클라이언트 경계가 필요하다.
 * 자식은 그대로 서버 컴포넌트로 남는다(children으로 건너갈 뿐이다).
 *
 * 비용: `Reveal`이 framer를 쓰지 않는 이유(애니메이션 런타임을 모든 경로에
 * 싣지 않기)와 부딪히지 않는지 재 봤다. `MotionConfig`는 컨텍스트 프로바이더
 * 하나라 애니메이션 엔진을 끌고 오지 않는다 — /about·/portfolio의 첫 JS가
 * gzip 기준 +0.9 KB(187.8 → 188.7 KB)였다.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
