// 한글 자모·음절 범위. 한자·가나는 제외(Japanese 스택이 따로 있다).
const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/;

export function hasHangul(text: string | null | undefined): boolean {
  return typeof text === 'string' && HANGUL.test(text);
}

export function displayFace(text: string | null | undefined): 'font-display-ko' | 'font-serif' {
  return hasHangul(text) ? 'font-display-ko' : 'font-serif';
}

export function labelFace(text: string | null | undefined): 'label-ko' | 'eyebrow' {
  return hasHangul(text) ? 'label-ko' : 'eyebrow';
}
