/**
 * 상자 하나의 윗면에 쌓이는 눈. 홈 화면 눈 효과(`components/home/Snowfall.tsx`)가
 * 쓰는 순수 계산이다 — 그리기도 DOM도 모른다.
 *
 * 윗면을 `bucket` px 폭의 칸으로 나누고 칸마다 높이를 둔다. 눈송이가 닿으면 그
 * 칸과 이웃 칸에 삼각형 모양으로 나눠 얹어 한 점만 뾰족해지지 않게 하고, 양 끝은
 * 낮게 깎아 둥근 더미로 보이게 한다. 높이는 `max`를 넘지 않는다 — 사진을 덮는
 * 것은 가장자리 몇 px까지다.
 */

export interface SnowPile {
  /** 더미가 놓이는 폭(px). 상자 폭에서 양쪽 여백을 뺀 값. */
  width: number;
  bucket: number;
  max: number;
  heights: Float32Array;
}

export interface PileOptions {
  bucket?: number;
  max?: number;
}

/** 눈송이 하나가 닿을 때 칸과 이웃 칸에 나눠 얹는 비율. */
const KERNEL = [0.3, 0.6, 1, 0.6, 0.3];

export function createPile(width: number, { bucket = 3, max = 10 }: PileOptions = {}): SnowPile {
  const count = Math.max(1, Math.ceil(Math.max(0, width) / bucket));
  return { width: Math.max(0, width), bucket, max, heights: new Float32Array(count) };
}

/** 칸 `i`가 가질 수 있는 최대 높이. 양 끝 네 칸은 점점 낮아져 더미가 둥글게 끝난다. */
export function capAt(pile: SnowPile, i: number): number {
  const n = pile.heights.length;
  const fromEdge = Math.min(i, n - 1 - i);
  return pile.max * Math.min(1, (fromEdge + 1) / 4);
}

function indexAt(pile: SnowPile, x: number): number {
  return Math.min(pile.heights.length - 1, Math.max(0, Math.floor(x / pile.bucket)));
}

/** 더미 위 `x`(더미 왼쪽 끝 기준)의 눈 높이. 범위 밖은 0. */
export function heightAt(pile: SnowPile, x: number): number {
  if (x < 0 || x > pile.width) return 0;
  return pile.heights[indexAt(pile, x)];
}

/** `x`에 눈 `amount`만큼을 얹는다. 이미 가득 찬 칸에는 더 쌓이지 않는다. */
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

/**
 * 처음부터 얇게 덮인 상태로 시작한다 — 페이지를 열자마자 "눈이 쌓인 상자"로
 * 보이게. `random`은 테스트가 고정값을 넣을 수 있게 받는다.
 */
export function seedPile(pile: SnowPile, depth = 3, random: () => number = Math.random): void {
  for (let i = 0; i < pile.heights.length; i++) {
    pile.heights[i] = Math.min(capAt(pile, i), depth * (0.7 + random() * 0.6));
  }
}

export interface LooseSnow {
  /** 더미 왼쪽 끝 기준 x. */
  x: number;
  /** 그 자리에 있던 눈 높이. 털려 나가는 눈송이 수를 정하는 데 쓴다. */
  depth: number;
}

/**
 * 더미를 털어 낸다. 높이가 있던 자리들을 돌려주고 더미는 비운다 — 부르는 쪽이
 * 그 자리에서 눈송이를 떨어뜨린다. 너무 많은 눈송이가 생기지 않게 `step` 칸마다
 * 하나씩만 돌려준다.
 */
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
