"use client";

import { useEffect, useRef, useState } from 'react';
import { addSnow, createPile, heightAt, isEmpty, seedPile, shakeOff, type SnowPile } from '@/lib/snow-pile';

/** 겨울 장식 기간에만 그린다. 동작 줄이기면 그리지 않고 CSS `.snow-cap`이 대신한다(`data-snow-live`가 끈다). */

interface Flake {
  x: number;
  y: number;
  prevY: number;
  r: number;
  speed: number;
  vx: number;
  drift: number;
  phase: number;
  alpha: number;
}

interface Target {
  el: Element;
  inset: number;
  pile: SnowPile;
  /** 상자 안에 둔 캔버스 — 고정 캔버스에 그리면 iOS 관성 스크롤에서 눈이 미끄러져 보였다. */
  canvas: HTMLCanvasElement;
  dirty: boolean;
}

const MAX_FLAKES = 70;
const AREA_PER_FLAKE = 16000;
const MAX_LOOSE = 240;
/** 이보다 빠르게(px/ms) 스크롤하면 보이는 상자의 눈을 턴다. */
const SHAKE_SCROLL_SPEED = 2.5;
const SHAKE_COOLDOWN = 600;
/** 쌓인 눈이 상자 윗변 아래로 내려오는 정도 — 얹혀 있는 것처럼 보이게. */
const OVERLAP = 2;
/** 더미 캔버스 위쪽 여유 — 윤곽선이 잘리지 않게. */
const HEADROOM = 2;

function makeFlake(width: number, height: number, anywhere: boolean): Flake {
  const y = anywhere ? Math.random() * height : -6;
  return {
    x: Math.random() * width,
    y,
    prevY: y,
    r: 1 + Math.random() * 1.6,
    speed: 0.25 + Math.random() * 0.6,
    vx: 0,
    drift: 0.3 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.65 + Math.random() * 0.35,
  };
}

function isPill(el: Element): boolean {
  return el.classList.contains('snow-cap-pill');
}

export default function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  // 동작 줄이기 설정은 브라우저에서만 안다. 서버 HTML에는 캔버스가 없다.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const host = canvas.closest('[data-winter]');
    host?.setAttribute('data-snow-live', '');

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let loose: Flake[] = [];
    let targets: Target[] = [];
    let frame = 0;
    let running = true;

    function pileCanvas(el: Element, inset: number, pile: SnowPile): HTMLCanvasElement {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const h = pile.max + HEADROOM + OVERLAP;
      const c = document.createElement('canvas');
      c.setAttribute('aria-hidden', 'true');
      c.className = 'snow-pile';
      c.width = Math.max(1, Math.round(pile.width * dpr));
      c.height = Math.round(h * dpr);
      Object.assign(c.style, {
        position: 'absolute',
        left: `${inset}px`,
        top: `${-(pile.max + HEADROOM)}px`,
        width: `${pile.width}px`,
        height: `${h}px`,
        pointerEvents: 'none',
        zIndex: '2',
      });
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      el.appendChild(c);
      return c;
    }

    function buildTargets() {
      const previous = new Map(targets.map(t => [t.el, t]));
      const next = Array.from(host?.querySelectorAll('.snow-cap') ?? []).map(el => {
        const inset = isPill(el) ? 14 : 6;
        const pileWidth = Math.max(0, el.getBoundingClientRect().width - inset * 2);
        const kept = previous.get(el);
        if (kept && Math.abs(kept.pile.width - pileWidth) < 1) {
          previous.delete(el);
          return kept;
        }
        const pile = createPile(pileWidth, { bucket: 3, max: isPill(el) ? 7 : 10 });
        seedPile(pile, isPill(el) ? 2.5 : 3.5);
        return { el, inset, pile, canvas: pileCanvas(el, inset, pile), dirty: true };
      });
      for (const stale of previous.values()) stale.canvas.remove();
      targets = next;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      // 아래 가장자리에서 4px 띄운다 — iOS Safari 26이 화면 아래 고정 요소를 툴바 색으로 읽는다.
      height = Math.max(0, window.innerHeight - 4);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_FLAKES, Math.round((width * height) / AREA_PER_FLAKE));
      flakes = flakes.slice(0, count);
      while (flakes.length < count) flakes.push(makeFlake(width, height, true));
      buildTargets();
    }

    function shake(target: Target, rect: DOMRect) {
      target.dirty = true;
      for (const bit of shakeOff(target.pile)) {
        if (loose.length >= MAX_LOOSE) break;
        const pieces = bit.depth > 6 ? 2 : 1;
        for (let p = 0; p < pieces; p++) {
          const y = rect.top - bit.depth * Math.random();
          loose.push({
            x: rect.left + target.inset + bit.x,
            y,
            prevY: y,
            r: 1 + Math.random() * 1.2,
            speed: 1.2 + Math.random() * 1.4,
            vx: (Math.random() - 0.5) * 1.6,
            drift: 0,
            phase: 0,
            alpha: 0.9,
          });
        }
      }
    }

    function land(flake: Flake, rects: DOMRect[]): boolean {
      for (let t = 0; t < targets.length; t++) {
        const rect = rects[t];
        if (rect.width === 0 || rect.bottom < 0 || rect.top > height) continue;
        const local = flake.x - rect.left - targets[t].inset;
        if (local < 0 || local > targets[t].pile.width) continue;
        const surface = rect.top - heightAt(targets[t].pile, local);
        if (flake.prevY <= surface && flake.y >= surface) {
          addSnow(targets[t].pile, local, flake.r * 1.1);
          targets[t].dirty = true;
          return true;
        }
      }
      return false;
    }

    function drawPile(target: Target) {
      const { pile, canvas: c } = target;
      target.dirty = false;
      const pctx = c.getContext('2d');
      if (!pctx) return;
      const top = pile.max + HEADROOM;
      pctx.clearRect(0, 0, pile.width, top + OVERLAP);
      if (isEmpty(pile)) return;
      const n = pile.heights.length;
      const points: Array<[number, number]> = [];
      for (let i = 0; i < n; i++) points.push([(i + 0.5) * pile.bucket, top - pile.heights[i]]);
      const contour = () => {
        pctx.lineTo(points[0][0], points[0][1]);
        for (let i = 1; i < n; i++) {
          const [px, py] = points[i - 1];
          const [cx, cy] = points[i];
          pctx.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);
        }
        pctx.lineTo(points[n - 1][0], points[n - 1][1]);
      };

      pctx.beginPath();
      pctx.moveTo(0, top + OVERLAP);
      contour();
      pctx.lineTo(pile.width, top + OVERLAP);
      pctx.closePath();
      pctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
      pctx.fill();

      pctx.beginPath();
      pctx.moveTo(points[0][0], points[0][1]);
      contour();
      pctx.lineWidth = 0.8;
      pctx.strokeStyle = 'rgba(22, 35, 26, 0.18)';
      pctx.stroke();
    }

    function drawFlake(flake: Flake) {
      ctx!.beginPath();
      ctx!.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
      ctx!.fill();
      ctx!.lineWidth = 0.6;
      ctx!.strokeStyle = 'rgba(22, 35, 26, 0.16)';
      ctx!.stroke();
    }

    function draw(time: number) {
      if (!running) return;
      const rects = targets.map(t => t.el.getBoundingClientRect());
      ctx!.clearRect(0, 0, width, height);

      for (const target of targets) if (target.dirty) drawPile(target);

      for (const flake of flakes) {
        flake.prevY = flake.y;
        flake.y += flake.speed;
        flake.x += Math.sin(time / 1600 + flake.phase) * flake.drift * 0.4;
        if (flake.x < -4) flake.x = width + 4;
        if (flake.x > width + 4) flake.x = -4;
        if (flake.y - flake.r > height || land(flake, rects)) {
          Object.assign(flake, makeFlake(width, height, false));
          continue;
        }
        drawFlake(flake);
      }

      loose = loose.filter(flake => {
        flake.prevY = flake.y;
        flake.y += flake.speed;
        flake.x += flake.vx;
        flake.vx *= 0.98;
        flake.speed = Math.min(3.2, flake.speed + 0.04);
        if (flake.y - flake.r > height || flake.x < -6 || flake.x > width + 6) return false;
        if (land(flake, rects)) return false;
        drawFlake(flake);
        return true;
      });

      frame = requestAnimationFrame(draw);
    }

    // 손가락 터치는 탭이 곧 링크 이동이라 다루지 않는다(폰은 빠른 스크롤로 턴다).
    let hovered: Element | null = null;
    function onPointerOver(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      const el = (event.target as Element | null)?.closest?.('.snow-cap') ?? null;
      if (el === hovered) return;
      hovered = el;
      if (!el) return;
      const target = targets.find(t => t.el === el);
      if (target) shake(target, el.getBoundingClientRect());
    }

    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();
    let lastShake = 0;
    function onScroll() {
      const now = performance.now();
      const speed = Math.abs(window.scrollY - lastScrollY) / Math.max(1, now - lastScrollTime);
      lastScrollY = window.scrollY;
      lastScrollTime = now;
      if (speed < SHAKE_SCROLL_SPEED || now - lastShake < SHAKE_COOLDOWN) return;
      lastShake = now;
      for (const target of targets) {
        const rect = target.el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < height) shake(target, rect);
      }
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(draw);
      }
    }

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const target of targets) target.canvas.remove();
      targets = [];
      host?.removeAttribute('data-snow-live');
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[calc(100%-4px)] w-full" />;
}
