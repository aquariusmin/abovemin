"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useStartsBelowFold } from './useStartsBelowFold';

// Shared editorial easing — slow settle, no bounce.
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION = 0.6;

/** Semantic elements this wrapper can render as (preserves accessible markup). */
type Tag = 'div' | 'section' | 'header' | 'article' | 'li';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Semantic tag to render (defaults to div) so headings/landmarks stay intact. */
  as?: Tag;
  /** Stagger helper: seconds of delay, e.g. index * 0.06 for a list. */
  delay?: number;
  /** Vertical travel distance in px (ignored under reduced-motion). */
  y?: number;
  /** How much of the element must be visible before it animates in. */
  amount?: number;
}

/**
 * Fades + rises its children into view the first time they scroll into the
 * viewport — but only if they started below the fold.
 *
 * The server HTML never hides anything: every `Reveal` is painted at full
 * opacity from the first byte, so a page header above the fold is part of the
 * first paint (and the LCP candidate) instead of waiting for hydration. Right
 * after hydration, before the browser paints again, `useStartsBelowFold`
 * measures the element; only one that sits below the viewport is dropped to
 * opacity 0 — invisibly, since it is off screen — and fades in when it
 * scrolls into view. The same principle as the grid tiles
 * (`useBelowFoldReveal`), without the framer runtime. With no JS the effect
 * never runs, so the content simply stays visible. Opacity and transform don't
 * affect layout, so hiding causes no shift.
 *
 * Deliberately NOT framer-motion. This is a one-shot fade-and-rise with no
 * gestures, no layout animation, no variants and no exit — an
 * IntersectionObserver and two CSS properties do all of it, and importing an
 * animation runtime to get them made every route that only uses `Reveal` pay
 * for a library it never really called. `/portfolio`, `/about` and
 * `/shop/[id]` now ship no animation library at all; the routes that genuinely
 * need one (the lightbox, the cart's `AnimatePresence`, the shop and archive
 * grids) still import it directly.
 *
 * Reduced motion is handled in `globals.css`: `[data-reveal]` drops the
 * transform there, and the global reduced-motion block already collapses the
 * transition, so the content simply appears. Nothing is ever withheld.
 */
export default function Reveal({
  children,
  className,
  as = 'div',
  delay = 0,
  y = 20,
  amount = 0.2,
}: RevealProps) {
  const { ref, deferred } = useStartsBelowFold<HTMLElement>();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Started on screen (or not measured yet): it is already visible and
    // never animates.
    if (!deferred) return;
    const el = ref.current;
    if (!el) return;
    // No observer (a pre-2019 browser, or a jsdom-style environment): show the
    // content rather than leaving it stuck at opacity 0. Deferred by a tick
    // rather than set inline, so the effect body never triggers a cascading
    // render on the path every real browser takes.
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(timer);
    }
    // `once` semantics: stop observing the moment it has been revealed, so a
    // long page does not keep dozens of live observers around.
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
  // Visible: no inline opacity/transform at all, so the server HTML carries
  // nothing that could hold the content back. The transition is attached only
  // once it is actually animating in — dropping to hidden happens off screen
  // and must be instant, not a 0.6s fade-out.
  const style: CSSProperties | undefined = hidden
    ? { opacity: 0, transform: `translateY(${y}px)`, willChange: 'opacity, transform' }
    : shown
      ? { transition: `opacity ${DURATION}s ${EASE} ${delay}s, transform ${DURATION}s ${EASE} ${delay}s` }
      : undefined;
  const reveal = hidden ? 'hidden' : 'shown';

  // Written out per tag rather than through `createElement(as, …)`: a ref
  // handed to a call whose callee is a variable can't be seen as a host
  // element, so the React Compiler's ref rule has to assume it is read during
  // render. Five branches is the cost of staying inside that guarantee.
  switch (as) {
    case 'section':
      return (
        <section ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style}>
          {children}
        </section>
      );
    case 'header':
      return (
        <header ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style}>
          {children}
        </header>
      );
    case 'article':
      return (
        <article ref={ref as React.Ref<HTMLElement>} className={className} data-reveal={reveal} style={style}>
          {children}
        </article>
      );
    case 'li':
      return (
        <li ref={ref as React.Ref<HTMLLIElement>} className={className} data-reveal={reveal} style={style}>
          {children}
        </li>
      );
    default:
      return (
        <div ref={ref as React.Ref<HTMLDivElement>} className={className} data-reveal={reveal} style={style}>
          {children}
        </div>
      );
  }
}
