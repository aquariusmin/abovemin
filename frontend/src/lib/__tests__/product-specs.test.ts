import { describe, expect, it } from 'vitest';
import { parseDescriptionSections, splitProductDescription } from '@/lib/product-specs';

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

describe('parseDescriptionSections', () => {
  const text = [
    '[Story]',
    '첫 문단 첫 줄.',
    '첫 문단 둘째 줄.',
    '',
    '둘째 문단.',
    '',
    '[PACKAGE]',
    '- 2027 탁상달력 1부',
    '- 포토 엽서 1장',
    '모든 상품은 하나의 세트로 제공됩니다.',
    '',
    '[DETAILS]',
    '01. Desk Calendar',
    '세로형 탁상달력입니다.',
    '- 크기: 148 × 238 mm',
    '- 구성: 표지 1p + 월별 내지 24p',
    '',
    '2. Photo Postcard',
    '- 크기: 102 × 152 mm',
    '',
    '[DELIVERY]',
    '- 배송비: 별도',
    '',
    '[EMPTY]',
  ].join('\n');

  it('섹션과 구성품 묶음을 나누고, 사양을 묶음마다 따로 둔다', () => {
    expect(parseDescriptionSections(text)).toEqual([
      {
        title: 'Story',
        parts: [{ number: null, title: null, blocks: [
          { kind: 'text', text: '첫 문단 첫 줄.\n첫 문단 둘째 줄.' },
          { kind: 'text', text: '둘째 문단.' },
        ] }],
      },
      {
        title: 'PACKAGE',
        parts: [{ number: null, title: null, blocks: [
          { kind: 'list', items: ['2027 탁상달력 1부', '포토 엽서 1장'] },
          { kind: 'text', text: '모든 상품은 하나의 세트로 제공됩니다.' },
        ] }],
      },
      {
        title: 'DETAILS',
        parts: [
          { number: '01', title: 'Desk Calendar', blocks: [
            { kind: 'text', text: '세로형 탁상달력입니다.' },
            { kind: 'specs', specs: [
              { label: '크기', value: '148 × 238 mm' },
              { label: '구성', value: '표지 1p + 월별 내지 24p' },
            ] },
          ] },
          { number: '02', title: 'Photo Postcard', blocks: [
            { kind: 'specs', specs: [{ label: '크기', value: '102 × 152 mm' }] },
          ] },
        ],
      },
      {
        title: 'DELIVERY',
        parts: [{ number: null, title: null, blocks: [
          { kind: 'specs', specs: [{ label: '배송비', value: '별도' }] },
        ] }],
      },
    ]);
  });

  it('[제목] 줄이 없으면 null — 예전 형식으로 넘긴다', () => {
    expect(parseDescriptionSections('2027 Calendar\n용지 두께 : 250gsm')).toBeNull();
  });

  it('첫 제목 앞의 글은 제목 없는 섹션이 된다', () => {
    expect(parseDescriptionSections('머리말\n[Story]\n본문')?.map(s => s.title)).toEqual([null, 'Story']);
  });
});
