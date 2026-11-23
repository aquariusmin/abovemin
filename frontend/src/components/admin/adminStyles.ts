/** DESIGN.md 레시피 위에 크기만 조정한다 — 새 색이나 모서리를 여기서 만들지 않는다. */

export const INPUT_CLASS = 'field-input';

export const INPUT_COMPACT = 'field-input px-3 py-2 text-sm';

export const LABEL_CLASS = 'field-label';

/** hover에 반응하지 않는다 — 큰 패널이 마우스를 따라 테두리 색을 바꾸면 산만하다. */
export const PANEL_CLASS = 'rounded-lg border border-border bg-card shadow-xs';

/** 한국어 눈썹이라 `.eyebrow` 대신 `.label-ko`에 틱을 붙인다 — 넓은 자간에서 한글이 흩어진다. */
export const EYEBROW_CLASS = 'label-ko eyebrow-marked text-muted-foreground';

/** 700은 로드되지 않으므로(DESIGN.md) 500까지만. */
export const SECTION_TITLE_CLASS = 'font-serif text-xl md:text-2xl font-medium tracking-tight text-ink';

export const BTN_SM = 'px-4 py-2 text-[13px]';

/** `.chip`의 넓은 자간에서 한글이 흩어져 본문 서체·기본 자간으로 되돌린다. */
export const CHIP_KO = 'normal-case tracking-[0.02em] [font-family:var(--font-body-stack)] text-xs';

export const FILTER_CHIP_CLASS =
  `chip ${CHIP_KO} cursor-pointer gap-1.5 py-1.5 transition-colors hover:border-forest/40 hover:text-forest ` +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ' +
  'data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground';

/** 터치 대상 32px. */
export const ICON_BTN_CLASS =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card ' +
  'text-slate transition-colors hover:border-forest/40 hover:text-forest ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30 disabled:pointer-events-none';

export const CHECKBOX_CLASS = 'h-4 w-4 shrink-0 cursor-pointer accent-forest';

export const MESSAGE_CLASS = {
  ok: 'text-[13px] text-forest',
  error: 'text-[13px] text-brick',
} as const;

export const ORDER_STATUS_CHIP: Record<string, string> = {
  pending: `chip ${CHIP_KO} border-brick-soft bg-brick/[0.07] text-brick`,
  confirmed: `chip ${CHIP_KO} border-cream-deep bg-cream text-secondary-foreground`,
  shipped: `chip ${CHIP_KO} border-forest/25 bg-moss-wash text-forest`,
  delivered: `chip ${CHIP_KO} border-forest bg-forest text-primary-foreground`,
  cancelled: `chip ${CHIP_KO} bg-muted text-muted-foreground`,
};

/** 택배와 대면 전달을 함께 세므로 "배송"이라는 말을 쓰지 않는다. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '입금 대기',
  confirmed: '준비 중',
  shipped: '배송 중',
  delivered: '완료',
  cancelled: '취소',
};
