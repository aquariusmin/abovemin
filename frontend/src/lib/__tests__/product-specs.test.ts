import { describe, expect, it } from 'vitest';
import { splitProductDescription } from '@/lib/product-specs';

describe('splitProductDescription', () => {
  it('"항목: 값" 줄을 사양으로, 나머지를 이야기로 나눈다', () => {
    const text = '2027 Calendar\n\n표지 1p + 내지 24p + 2028년 연간달력 1p\n사이즈(가로*세로)(mm): 148 * 238\n용지 두께 : 250gsm';
    expect(splitProductDescription(text)).toEqual({
      story: '2027 Calendar\n\n표지 1p + 내지 24p + 2028년 연간달력 1p',
      specs: [
        { label: '사이즈(가로*세로)(mm)', value: '148 * 238' },
        { label: '용지 두께', value: '250gsm' },
      ],
    });
  });

  it('주소와 시각, 긴 문장 속 콜론은 사양이 아니다', () => {
    const text = '자세한 사진: https://abovemin.com\nhttps://abovemin.com/a\n10:30에 찍은 사진\n이 사진은 오랫동안 기다린 끝에 해가 지는 순간을 담았습니다: 그날의 빛';
    const { specs } = splitProductDescription(text);
    expect(specs).toEqual([{ label: '자세한 사진', value: 'https://abovemin.com' }]);
  });

  it('맞는 줄이 없으면 설명이 그대로 남는다', () => {
    expect(splitProductDescription('한 줄 이야기')).toEqual({ story: '한 줄 이야기', specs: [] });
  });
});
