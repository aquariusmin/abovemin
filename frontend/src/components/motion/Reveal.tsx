"use client";

import { useEffect, useState, type CSSProperties, type ReactNode, type TransitionEvent } from 'react';
import Link from 'next/link';
import { useStartsBelowFold } from './useStartsBelowFold';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION = 0.6;

type Tag = 'div' | 'section' | 'header' | 'article' | 'li';

interface RevealBaseProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  amount?: number;
}

type RevealProps = RevealBaseProps &
  (
    | {
        as?: Tag;
        href?: undefined;
      }
    | {
        as: 'a';
        href: string;
      }
  );

/** Hydration-safe: server HTML hides nothing; only elements measured below the fold fade in. Not framer. */
export default function Reveal({
  children,
  className,
  as = 'div',
  href,
  delay = 0,
  duration = DURATION,
  y = 20,
  amount = 0.2,
}: RevealProps) {
  const { ref, deferred } = useStartsBelowFold<HTMLElement>();
  const [shown, setShown] = useState(false);
  // After the rise: no inline style, so a stylesheet transition (hover lift) isn't outranked.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!deferred) return;
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver: show the content rather than leave it stuck at opacity 0.
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: amount },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [deferred, amount, ref]);

  const hidden = deferred && !shown;
  // Transitions bubble: ignore the children's.
  const onTransitionEnd = (event: TransitionEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'opacity') setSettled(true);
  };
  // Hiding happens off screen and must be instant; the transition attaches only while animating in.
  const style: CSSProperties | undefined = hidden
    ? { opacity: 0, transform: `translateY(${y}px)`, willChange: 'opacity, transform' }
    : shown && !settled
      ? { transition: `opacity ${duration}s ${EASE} ${delay}s, transform ${duration}s ${EASE} ${delay}s` }
      : undefined;
  const reveal = hidden ? 'hidden' : 'shown';

  // Per-tag branches, not `createElement(as)`: the React Compiler ref rule needs a visible host element.
  switch (as) {
    case 'section':
      return (
        <section ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </section>
      );
    case 'header':
      return (
        <header ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </header>
      );
    case 'article':
      return (
        <article ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </article>
      );
    case 'a':
      return (
        <Link href={href ?? ''} ref={ref as React.Ref<HTMLAnchorElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </Link>
      );
    case 'li':
      return (
        <li ref={ref as React.Ref<HTMLLIElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </li>
      );
    default:
      return (
        <div ref={ref as React.Ref<HTMLDivElement>} className={className} data-reveal={reveal} style={style} onTransitionEnd={onTransitionEnd}>
          {children}
        </div>
      );
  }
}
