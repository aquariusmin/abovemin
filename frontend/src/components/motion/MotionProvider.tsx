"use client";

import { MotionConfig } from 'framer-motion';

/** 모든 framer-motion 컴포넌트가 OS의 동작 줄이기를 따르게 루트에서 한 번 건다(`reducedMotion="user"`). */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
