export interface SnowPile {
  width: number;
  bucket: number;
  max: number;
  heights: Float32Array;
}

export interface PileOptions {
  bucket?: number;
  max?: number;
}

const KERNEL = [0.3, 0.6, 1, 0.6, 0.3];

export function createPile(width: number, { bucket = 3, max = 10 }: PileOptions = {}): SnowPile {
  const count = Math.max(1, Math.ceil(Math.max(0, width) / bucket));
  return { width: Math.max(0, width), bucket, max, heights: new Float32Array(count) };
}

// 양 끝 네 칸은 점점 낮아져 더미가 둥글게 끝난다.
export function capAt(pile: SnowPile, i: number): number {
  const n = pile.heights.length;
  const fromEdge = Math.min(i, n - 1 - i);
  return pile.max * Math.min(1, (fromEdge + 1) / 4);
}

function indexAt(pile: SnowPile, x: number): number {
  return Math.min(pile.heights.length - 1, Math.max(0, Math.floor(x / pile.bucket)));
}

export function heightAt(pile: SnowPile, x: number): number {
  if (x < 0 || x > pile.width) return 0;
  return pile.heights[indexAt(pile, x)];
}

export function addSnow(pile: SnowPile, x: number, amount: number): void {
  if (x < 0 || x > pile.width || amount <= 0) return;
  const center = indexAt(pile, x);
  const half = (KERNEL.length - 1) / 2;
  for (let k = 0; k < KERNEL.length; k++) {
    const i = center + k - half;
    if (i < 0 || i >= pile.heights.length) continue;
    pile.heights[i] = Math.min(capAt(pile, i), pile.heights[i] + amount * KERNEL[k]);
  }
}

export function seedPile(pile: SnowPile, depth = 3, random: () => number = Math.random): void {
  for (let i = 0; i < pile.heights.length; i++) {
    pile.heights[i] = Math.min(capAt(pile, i), depth * (0.7 + random() * 0.6));
  }
}

export interface LooseSnow {
  x: number;
  depth: number;
}

// 눈송이가 너무 많아지지 않게 `step` 칸마다 하나씩만 돌려준다.
export function shakeOff(pile: SnowPile, step = 3): LooseSnow[] {
  const loose: LooseSnow[] = [];
  for (let i = 0; i < pile.heights.length; i++) {
    const depth = pile.heights[i];
    if (depth > 0.5 && i % step === 0) loose.push({ x: (i + 0.5) * pile.bucket, depth });
    pile.heights[i] = 0;
  }
  return loose;
}

export function isEmpty(pile: SnowPile): boolean {
  return pile.heights.every(h => h <= 0.5);
}
