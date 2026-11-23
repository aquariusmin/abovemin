/**
 * 글자에 맞춰 글꼴 클래스를 고른다.
 *
 * 제목 글꼴(Fraunces)은 영문 전용이다. 한글이 섞인 제목에 그대로 쓰면 한 줄 안에서
 * 영문·숫자·문장부호는 세리프로, 한글은 Plex Sans KR로 찍혀 두 글꼴이 우연히
 * 만난 것처럼 보인다("5개의 앨범, 299장의 사진", "2027 Calendar (탁상형)").
 * 그래서 한글이 한 글자라도 있으면 제목 전체를 IBM Plex 한 벌로 맞춘다
 * (`.font-display-ko`). 영문만 있는 제목(로고, 앨범명 "Japan", 연도)은 세리프 그대로.
 *
 * 라벨도 같은 이유다: `.eyebrow`는 영문 대문자에 맞춘 자간(0.16em)이라 한글에
 * 걸리면 "탁 상 형"처럼 벌어진다. 한글이면 `.label-ko`.
 *
 * 문자열이 DB에서 오는 자리(상품명·앨범명·사진 제목·노트 제목·히어로 문구)에서
 * 쓴다. 고정 문구는 마크업에 클래스를 직접 적는다.
 */

/** 한글 자모·음절. 한자·가나는 포함하지 않는다(Japanese 스택이 따로 있다). */
const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/;

export function hasHangul(text: string | null | undefined): boolean {
  return typeof text === 'string' && HANGUL.test(text);
}

/** 제목 글꼴: 한글이 있으면 Plex 한 벌, 없으면 세리프. */
export function displayFace(text: string | null | undefined): 'font-display-ko' | 'font-serif' {
  return hasHangul(text) ? 'font-display-ko' : 'font-serif';
}

/** 작은 라벨: 한글이 있으면 자간 없는 한국어 라벨, 없으면 영문 대문자 라벨. */
export function labelFace(text: string | null | undefined): 'label-ko' | 'eyebrow' {
  return hasHangul(text) ? 'label-ko' : 'eyebrow';
}
