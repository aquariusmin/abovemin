import { describe, expect, it } from 'vitest';
import { addSnow, capAt, createPile, heightAt, isEmpty, seedPile, shakeOff } from '@/lib/snow-pile';

describe('snow pile', () => {
  it('닿은 자리와 이웃 칸에 나눠 쌓인다', () => {
    const pile = createPile(60, { bucket: 3, max: 10 });
    addSnow(pile, 30, 2);
    expect(heightAt(pile, 30)).toBeCloseTo(2);
    expect(heightAt(pile, 27)).toBeCloseTo(1.2);
    expect(heightAt(pile, 24)).toBeCloseTo(0.6);
    expect(heightAt(pile, 15)).toBe(0);
  });

  it('최대 높이를 넘지 않고, 양 끝은 더 낮게 끝난다', () => {
    const pile = createPile(60, { bucket: 3, max: 10 });
    for (let i = 0; i < 200; i++) addSnow(pile, 30, 3);
    expect(heightAt(pile, 30)).toBe(10);
    expect(capAt(pile, 0)).toBeCloseTo(2.5);
    for (let i = 0; i < 200; i++) addSnow(pile, 0, 3);
    expect(heightAt(pile, 0)).toBeCloseTo(2.5);
  });

  it('상자 밖은 쌓이지 않고 높이 0이다', () => {
    const pile = createPile(30);
    addSnow(pile, -1, 5);
    addSnow(pile, 31, 5);
    expect(isEmpty(pile)).toBe(true);
    expect(heightAt(pile, 40)).toBe(0);
  });

  it('처음엔 얇게 덮여 있고, 털면 비면서 떨어질 자리를 돌려준다', () => {
    const pile = createPile(60, { bucket: 3, max: 10 });
    seedPile(pile, 3, () => 0.5);
    expect(heightAt(pile, 30)).toBeCloseTo(3);
    const loose = shakeOff(pile, 3);
    expect(loose.length).toBe(7);
    expect(loose[0]).toEqual({ x: 1.5, depth: expect.any(Number) });
    expect(isEmpty(pile)).toBe(true);
  });
});
