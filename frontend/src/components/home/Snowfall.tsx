"use client";

import { useEffect, useRef, useState } from 'react';
import { addSnow, createPile, heightAt, isEmpty, seedPile, shakeOff, type SnowPile } from '@/lib/snow-pile';

/**
 * 홈 화면의 눈. 겨울 장식 기간에만 그려진다(`lib/season.ts`).
 *
 * 내리는 눈과 쌓인 눈을 한 캔버스에 그린다. 눈송이가 `.snow-cap` 상자(사진 타일,
 * 짙은 띠의 버튼)의 윗면에 닿으면 사라지지 않고 그 자리에 쌓인다 — 계산은
 * `lib/snow-pile.ts`. 쌓인 눈은 상자를 따라 스크롤된다(매 프레임 상자 위치를 읽는다).
 *
 * 털어 내기:
 *  - 마우스를 사진 위에 올리면 그 상자의 눈이 털려 떨어진다. 사진을 볼 때 눈이
 *    가리지 않게 하는 역할도 한다.
 *  - 폰에서는 빠르게 스크롤하면 화면에 보이는 상자들의 눈이 털린다.
 *
 * 사진이 주인공이라 조용하게: 눈송이는 작고(반지름 1~2.6px) 드물며(최대 70개),
 * 쌓인 눈은 10px(알약 버튼 7px)을 넘지 않는다. 캔버스는 클릭을 막지 않고
 * 내비게이션(z-50) 아래에 있다. 크림 바탕에서도 보이게 눈에 옅은 숲색 테두리.
 *
 * "동작 줄이기"면 그리지 않는다 — 그때는 CSS가 상자 위에 고정된 눈 그림을
 * 얹는다(`globals.css`의 `.snow-cap`). 캔버스가 돌기 시작하면 `<main>`에
 * `data-snow-live`를 붙여 그 그림을 끈다. 탭이 가려지면 멈춘다.
 */

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
}

const MAX_FLAKES = 70;
const AREA_PER_FLAKE = 16000;
const MAX_LOOSE = 240;
/** 이보다 빠르게(px/ms) 스크롤하면 보이는 상자의 눈을 턴다. */
const SHAKE_SCROLL_SPEED = 2.5;
const SHAKE_COOLDOWN = 600;
/** 쌓인 눈이 상자 윗변 아래로 내려오는 정도 — 얹혀 있는 것처럼 보이게. */
const OVERLAP = 2;

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

    function buildTargets() {
      const previous = new Map(targets.map(t => [t.el, t]));
      targets = Array.from(host?.querySelectorAll('.snow-cap') ?? []).map(el => {
        const inset = isPill(el) ? 14 : 6;
        const pileWidth = Math.max(0, el.getBoundingClientRect().width - inset * 2);
        const kept = previous.get(el);
        if (kept && Math.abs(kept.pile.width - pileWidth) < 1) return kept;
        const pile = createPile(pileWidth, { bucket: 3, max: isPill(el) ? 7 : 10 });
        seedPile(pile, isPill(el) ? 2.5 : 3.5);
        return { el, inset, pile };
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_FLAKES, Math.round((width * height) / AREA_PER_FLAKE));
      flakes = flakes.slice(0, count);
      while (flakes.length < count) flakes.push(makeFlake(width, height, true));
      buildTargets();
    }

    function shake(target: Target, rect: DOMRect) {
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

    /** 눈송이가 이번 프레임에 어느 상자의 눈 위에 닿았으면 쌓고 true. */
    function land(flake: Flake, rects: DOMRect[]): boolean {
      for (let t = 0; t < targets.length; t++) {
        const rect = rects[t];
        if (rect.width === 0 || rect.bottom < 0 || rect.top > height) continue;
        const local = flake.x - rect.left - targets[t].inset;
        if (local < 0 || local > targets[t].pile.width) continue;
        const surface = rect.top - heightAt(targets[t].pile, local);
        if (flake.prevY <= surface && flake.y >= surface) {
          addSnow(targets[t].pile, local, flake.r * 1.1);
          return true;
        }
      }
      return false;
    }

    function drawPile(target: Target, rect: DOMRect) {
      const { pile, inset } = target;
      if (isEmpty(pile) || rect.width === 0 || rect.bottom < 0 || rect.top - pile.max > height) return;
      const x0 = rect.left + inset;
      const base = rect.top + OVERLAP;
      const n = pile.heights.length;
      // 칸 가운데를 잇되 이웃 칸과의 중점으로 이어 부드럽게.
      const points: Array<[number, number]> = [];
      for (let i = 0; i < n; i++) points.push([x0 + (i + 0.5) * pile.bucket, rect.top - pile.heights[i]]);

      ctx!.beginPath();
      ctx!.moveTo(x0, base);
      ctx!.lineTo(points[0][0], points[0][1]);
      for (let i = 1; i < n; i++) {
        const [px, py] = points[i - 1];
        const [cx, cy] = points[i];
        ctx!.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);
      }
      ctx!.lineTo(points[n - 1][0], points[n - 1][1]);
      ctx!.lineTo(x0 + pile.width, base);
      ctx!.closePath();
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.97)';
      ctx!.fill();

      // 윗면 윤곽만 옅게 — 크림 바탕에서도 눈 더미의 모양이 보이게.
      ctx!.beginPath();
      ctx!.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < n; i++) {
        const [px, py] = points[i - 1];
        const [cx, cy] = points[i];
        ctx!.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);
      }
      ctx!.lineWidth = 0.8;
      ctx!.strokeStyle = 'rgba(22, 35, 26, 0.18)';
      ctx!.stroke();
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

      for (let t = 0; t < targets.length; t++) drawPile(targets[t], rects[t]);

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

      // 털려 나온 눈: 더 빨리, 옆으로 조금 튀며 떨어지고 화면을 벗어나면 끝.
      // 아래쪽 상자에 다시 닿으면 거기 쌓인다.
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

    // 사진 위에 마우스를 올리면 그 상자의 눈을 턴다. 손가락 터치는 탭이 곧 링크
    // 이동이라 여기서 다루지 않는다(폰은 빠른 스크롤로 턴다).
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
      host?.removeAttribute('data-snow-live');
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full" />;
}
