/**
 * 관리 화면 공통 스타일. 전부 DESIGN.md의 레시피(`globals.css`의
 * `@layer components`) 위에 크기만 조정한다 — 새 색이나 모서리를 여기서 만들지
 * 않는다.
 *
 * 예전 관리 화면은 `rounded-sm` 카드·입력, `bg-ink text-white` 필터, 9px 사각
 * 상태 칩으로 사이트와 다른 시스템처럼 보였다. 카드는 `--radius-lg`, 버튼과
 * 칩은 알약, 활성 상태는 잉크가 아니라 forest다.
 *
 * 레시피가 `@layer components`에 있으므로 여기 붙인 유틸리티(`py-2` 등)가
 * 레시피를 이긴다.
 */

/** 기본 입력. `.field-input`: 1px `--input` 테두리, `--radius-md`, ring 포커스. */
export const INPUT_CLASS = 'field-input';

/** 표·목록 안의 촘촘한 입력. 크기만 줄인다. */
export const INPUT_COMPACT = 'field-input px-3 py-2 text-sm';

export const LABEL_CLASS = 'field-label';

/**
 * 섹션 패널. `.card-hair`와 같은 표면(흰 카드, 1px 테두리, `--radius-lg`,
 * shadow-xs)이되 hover에 반응하지 않는다 — 화면 절반을 덮는 패널이 마우스를
 * 따라 테두리 색을 바꾸면 산만하다. 눌러서 여는 카드에는 `.card-hair`를 쓴다.
 */
export const PANEL_CLASS = 'rounded-lg border border-border bg-card shadow-xs';

/**
 * 섹션을 여는 눈썹 — forest→moss 틱이 붙은 `.eyebrow-marked`. 관리 화면의
 * 눈썹은 거의 한국어라 mono 대문자 `.eyebrow` 대신 `.label-ko`에 틱을 붙인다
 * (0.24em 자간에서 "데 이 터 점 검"처럼 글자가 흩어졌다).
 */
export const EYEBROW_CLASS = 'label-ko eyebrow-marked text-muted-foreground';

/** 섹션 제목. 700은 로드되지 않으므로(DESIGN.md) 500까지만. */
export const SECTION_TITLE_CLASS = 'font-serif text-xl md:text-2xl font-medium tracking-tight text-ink';

/** 작은 알약 버튼 크기. `.btn-*` 레시피에 덧붙인다. */
export const BTN_SM = 'px-4 py-2 text-[13px]';

/**
 * 한국어가 들어가는 칩에 덧붙인다. `.chip`은 mono 대문자 0.12em 자간인데, 한글은
 * 대소문자가 없고 네모난 글자 폭이 넓은 자간에서 흩어진다(`.label-ko`와 같은
 * 이유). 본문 서체와 거의 기본 자간으로 되돌린다.
 */
export const CHIP_KO = 'normal-case tracking-[0.02em] [font-family:var(--font-body-stack)] text-xs';

/**
 * 필터 칩. `.chip`에는 활성 상태가 없어서 `.btn-outline[data-active]`와 같은
 * 규칙(forest 채움)을 유틸리티로 준다. 잉크/흰색 반전은 쓰지 않는다.
 */
export const FILTER_CHIP_CLASS =
  `chip ${CHIP_KO} cursor-pointer gap-1.5 py-1.5 transition-colors hover:border-forest/40 hover:text-forest ` +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ' +
  'data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground';

/** 위/아래 같은 원형 아이콘 버튼. 터치 대상 32px. */
export const ICON_BTN_CLASS =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card ' +
  'text-slate transition-colors hover:border-forest/40 hover:text-forest ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30 disabled:pointer-events-none';

/** 체크박스. 브라우저 기본 모양에 브랜드 색만 입힌다. */
export const CHECKBOX_CLASS = 'h-4 w-4 shrink-0 cursor-pointer accent-forest';

export const MESSAGE_CLASS = {
  ok: 'text-[13px] text-forest',
  error: 'text-[13px] text-brick',
} as const;

/** 주문 상태 칩. 이행 단계를 따라 무게가 올라간다: clay 경고 → cream → moss → forest. */
export const ORDER_STATUS_CHIP: Record<string, string> = {
  pending: `chip ${CHIP_KO} border-brick-soft bg-brick/[0.07] text-brick`,
  confirmed: `chip ${CHIP_KO} border-cream-deep bg-cream text-secondary-foreground`,
  shipped: `chip ${CHIP_KO} border-forest/25 bg-moss-wash text-forest`,
  delivered: `chip ${CHIP_KO} border-forest bg-forest text-primary-foreground`,
  cancelled: `chip ${CHIP_KO} bg-muted text-muted-foreground`,
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '입금 대기',
  confirmed: '입금 확인',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소',
};
