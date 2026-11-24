import type { DescriptionBlock, DescriptionSection } from '@/lib/product-specs';
import { displayFace } from '@/lib/typography';

/** 섹션 제목을 자리로 바꾼다. 모르는 제목은 `other` — 맨 아래 줄에 차례대로 놓인다. */
export type SectionSlot = 'story' | 'package' | 'details' | 'delivery' | 'other';

const SLOT_ALIASES: Record<Exclude<SectionSlot, 'other'>, RegExp> = {
  story: /^(story|이야기|소개)$/i,
  package: /^(package|구성|구성품)$/i,
  details: /^(details?|specs?|상세|사양)$/i,
  delivery: /^(delivery|shipping|배송|수령)$/i,
};

export function sectionSlot(section: DescriptionSection): SectionSlot {
  if (section.title === null) return 'story';
  for (const [slot, pattern] of Object.entries(SLOT_ALIASES)) {
    if (pattern.test(section.title)) return slot as SectionSlot;
  }
  return 'other';
}

/** 가격은 구매 영역이 정본이다 — 설명에 적힌 가격은 바뀌어도 따라오지 않으니 그리지 않는다. */
const PRICE_LABEL = /^(판매\s*)?가격$/;

function Blocks({ blocks, tone = 'body' }: { blocks: DescriptionBlock[]; tone?: 'body' | 'quiet' }) {
  const text = tone === 'quiet' ? 'text-[14px] text-slate' : 'text-[15px] text-ink-body';
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.kind === 'text') {
          return (
            <p key={i} className={`whitespace-pre-line leading-relaxed ${text}`}>
              {block.text}
            </p>
          );
        }
        if (block.kind === 'list') {
          return (
            <ul key={i} className={`space-y-1.5 leading-relaxed ${text}`}>
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-px w-2.5 shrink-0 bg-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        const specs = block.specs.filter(spec => !PRICE_LABEL.test(spec.label));
        if (specs.length === 0) return null;
        return (
          <dl key={i} className="divide-y divide-hairline border-y border-hairline">
            {specs.map((spec, j) => (
              <div key={j} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                <dt className="label-ko text-slate">{spec.label}</dt>
                <dd className="text-[15px] text-ink-body tabular-nums">{spec.value}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </div>
  );
}

function SectionBody({ section, tone }: { section: DescriptionSection; tone?: 'body' | 'quiet' }) {
  return (
    <div className="space-y-6">
      {section.parts.map((part, i) => (
        <div key={i} className="space-y-3">
          {part.title && <h3 className="text-[15px] font-medium text-ink">{part.title}</h3>}
          <Blocks blocks={part.blocks} tone={tone} />
        </div>
      ))}
    </div>
  );
}

function Eyebrow({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="eyebrow text-muted-foreground">
      {children}
    </h2>
  );
}

/** 구매 영역 곁에 두는 짧은 구성 목록. */
export function PackageSection({ section }: { section: DescriptionSection }) {
  return (
    <section aria-labelledby="desc-package" className="space-y-3">
      <Eyebrow id="desc-package">{section.title ?? 'Package'}</Eyebrow>
      <SectionBody section={section} />
    </section>
  );
}

/**
 * 사진·구매 영역 아래의 전체 폭 구역. 데스크톱에서 긴 설명이 오른쪽 칸만 늘려
 * 사진 아래를 비워 두지 않도록 여기로 내린다. 구성품 묶음은 나란히 놓는다.
 */
export function ProductDescriptionBody({ sections }: { sections: DescriptionSection[] }) {
  const pick = (slot: SectionSlot) => sections.filter(section => sectionSlot(section) === slot);
  const story = pick('story');
  const details = pick('details');
  const delivery = pick('delivery');
  const other = pick('other');
  if (story.length + details.length + delivery.length + other.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto mt-16 md:mt-24 space-y-14 md:space-y-20">
      {(story.length > 0 || delivery.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 lg:gap-16 border-t border-hairline pt-10 md:pt-14">
          {story.length > 0 && (
            <section aria-labelledby="desc-story" className="md:col-span-7 space-y-4">
              <Eyebrow id="desc-story">{story[0].title ?? 'Story'}</Eyebrow>
              <div className="max-w-[60ch] text-[16px] space-y-6">
                {story.map((section, i) => (
                  <SectionBody key={i} section={section} />
                ))}
              </div>
            </section>
          )}
          {delivery.map((section, i) => (
            <section
              key={i}
              aria-labelledby={`desc-delivery-${i}`}
              className={`space-y-4 md:col-span-5 ${story.length > 0 ? '' : 'md:col-start-1'}`}
            >
              <Eyebrow id={`desc-delivery-${i}`}>{section.title}</Eyebrow>
              <SectionBody section={section} />
            </section>
          ))}
        </div>
      )}

      {details.map((section, i) => {
        const titled = section.parts.filter(part => part.title);
        const loose = section.parts.filter(part => !part.title);
        return (
          <section key={i} aria-labelledby={`desc-details-${i}`} className="space-y-6">
            <Eyebrow id={`desc-details-${i}`}>{section.title}</Eyebrow>
            {loose.length > 0 && (
              <div className="max-w-[60ch]">
                <SectionBody section={{ ...section, parts: loose }} />
              </div>
            )}
            {titled.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                {titled.map((part, j) => (
                  <article key={j} className="space-y-4 border-t border-ink/70 pt-5">
                    <div className="space-y-1">
                      {part.number && <p className="font-mono text-[12px] tracking-[0.16em] text-muted-foreground">{part.number}</p>}
                      <h3 className={`${displayFace(part.title!)} text-xl md:text-2xl font-medium tracking-tight leading-[1.25] text-ink`}>
                        {part.title}
                      </h3>
                    </div>
                    <Blocks blocks={part.blocks} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {other.map((section, i) => (
        <section key={i} aria-labelledby={`desc-other-${i}`} className="max-w-3xl space-y-4">
          <Eyebrow id={`desc-other-${i}`}>{section.title}</Eyebrow>
          <SectionBody section={section} tone="quiet" />
        </section>
      ))}
    </div>
  );
}
