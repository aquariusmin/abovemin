import { describe, expect, it } from 'vitest';
import { displayFace, hasHangul, labelFace } from '@/lib/typography';

describe('typography', () => {
  it('한글이 한 글자라도 있으면 Plex 한 벌, 영문만이면 세리프', () => {
    expect(displayFace('2027 Calendar (탁상형)')).toBe('font-display-ko');
    expect(displayFace('5개의 앨범')).toBe('font-display-ko');
    expect(displayFace('Japan 🇯🇵')).toBe('font-serif');
    expect(displayFace('Collecting the Greenery')).toBe('font-serif');
    expect(displayFace(null)).toBe('font-serif');
  });

  it('라벨도 같은 기준. 한자·가나는 한글로 보지 않는다', () => {
    expect(labelFace('탁상형')).toBe('label-ko');
    expect(labelFace('NYC · 2025')).toBe('eyebrow');
    expect(hasHangul('東京')).toBe(false);
    expect(hasHangul('ㄱ')).toBe(true);
  });
});
