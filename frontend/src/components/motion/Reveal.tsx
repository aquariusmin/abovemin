"use client";

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// Shared editorial easing — slow settle, no bounce.
const EASE = [0.22, 1, 0.36, 1] as const;

// Semantic elements this wrapper can render as (preserves accessible markup).
const TAGS = {
  div: motion.div,
  section: motion.section,
  header: motion.header,
  article: motion.article,
  li: motion.li,
} as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Semantic tag to render (defaults to div) so headings/landmarks stay intact. */
  as?: keyof typeof TAGS;
  /** Stagger helper: seconds of delay, e.g. index * 0.06 for a list. */
  delay?: number;
  /** Vertical travel distance in px (ignored under reduced-motion). */
  y?: number;
  /** How much of the element must be visible before it animates in. */
  amount?: number;
}

/**
 * Fades + rises its children into view the first time they scroll into the
 * viewport. Honours the OS "reduce motion" setting by dropping the transform
 * and keeping a plain fade, so content is never withheld from anyone.
 */
export default function Reveal({ children, className, as = 'div', delay = 0, y = 20, amount = 0.2 }: RevealProps) {
  const reduce = useReducedMotion();
  const Motion = TAGS[as];
  return (
    <Motion
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </Motion>
  );
}
