"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * 홈 화면에만 내리는 눈. 겨울 장식 기간에만 그려진다(`lib/season.ts`).
 *
 * 사진이 주인공인 사이트라 눈은 조용해야 한다: 작고(반지름 1~2.6px), 드물고
 * (화면 넓이에 비례, 최대 70개), 천천히 내린다. 화면 전체를 덮는 고정 캔버스지만
 * `pointer-events: none`이라 클릭을 막지 않고, 내비게이션(z-50) 아래에 있다.
 *
 * 바탕이 크림색이라 흰 점만으로는 보이지 않는다. 그래서 눈송이마다 아주 옅은
 * 숲색 테두리를 둘러, 밝은 바탕에서는 작은 원으로, 짙은 띠와 사진 위에서는 흰
 * 눈으로 읽히게 한다.
 *
 * "동작 줄이기"를 켠 사람에게는 그리지 않는다. 탭이 가려지면 멈춘다.
 */

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

const MAX_FLAKES = 70;
const AREA_PER_FLAKE = 16000;

function makeFlake(width: number, height: number, anywhere: boolean): Flake {
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -6,
    r: 1 + Math.random() * 1.6,
    speed: 0.25 + Math.random() * 0.6,
    drift: 0.3 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.65 + Math.random() * 0.35,
  };
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

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let frame = 0;
    let running = true;

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
    }

    function draw(time: number) {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);
      for (const flake of flakes) {
        flake.y += flake.speed;
        flake.x += Math.sin(time / 1600 + flake.phase) * flake.drift * 0.4;
        if (flake.y - flake.r > height) Object.assign(flake, makeFlake(width, height, false));
        if (flake.x < -4) flake.x = width + 4;
        if (flake.x > width + 4) flake.x = -4;
        ctx!.beginPath();
        ctx!.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
        ctx!.fill();
        ctx!.lineWidth = 0.6;
        ctx!.strokeStyle = 'rgba(22, 35, 26, 0.16)';
        ctx!.stroke();
      }
      frame = requestAnimationFrame(draw);
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
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full" />;
}
