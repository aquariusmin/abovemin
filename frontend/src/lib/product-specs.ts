// 설명에서 콜론 앞이 짧은 "항목: 값" 줄만 사양으로 떼고, 나머지는 이야기로 남긴다.
export interface ProductSpec {
  label: string;
  value: string;
}

const SPEC_LINE = /^([^:：]{1,24}?)\s*[:：]\s*(.+)$/;

export function splitProductDescription(text: string): { story: string; specs: ProductSpec[] } {
  const story: string[] = [];
  const specs: ProductSpec[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const match = SPEC_LINE.exec(line);
    // 주소(`https://…`)와 시각(`10:30`)은 사양이 아니다.
    if (match && !/https?$/i.test(match[1]) && !/^\d+$/.test(match[1])) {
      specs.push({ label: match[1].trim(), value: match[2].trim() });
    } else {
      story.push(raw);
    }
  }
  return { story: story.join('\n').trim(), specs };
}

/*
 * `[제목]` 줄로 섹션을 나눈 설명. 섹션 안에서 `01. 이름` 줄은 구성품 묶음을 연다.
 * 한 상품이 여러 구성품(달력·스티커·엽서)을 담을 때 사양이 한 표로 섞이지 않게 한다.
 */
export type DescriptionBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'specs'; specs: ProductSpec[] };

export interface DescriptionPart {
  /** `01. Desk Calendar`의 `01`. 묶음 제목이 없으면 null. */
  number: string | null;
  title: string | null;
  blocks: DescriptionBlock[];
}

export interface DescriptionSection {
  /** `[PACKAGE]`의 `PACKAGE`. 첫 제목 앞의 글은 null. */
  title: string | null;
  parts: DescriptionPart[];
}

const SECTION_LINE = /^\[([^\]]{1,40})\]$/;
const PART_LINE = /^(\d{1,2})[.)]\s+(.+)$/;
const LIST_LINE = /^[-•·*]\s+(.+)$/;

function toSpec(line: string): ProductSpec | null {
  const match = SPEC_LINE.exec(line);
  if (!match || /https?$/i.test(match[1]) || /^\d+$/.test(match[1])) return null;
  return { label: match[1].trim(), value: match[2].trim() };
}

/** `[제목]` 줄이 하나도 없으면 null — 예전 형식은 `splitProductDescription`이 맡는다. */
export function parseDescriptionSections(text: string): DescriptionSection[] | null {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  if (!lines.some(line => SECTION_LINE.test(line))) return null;

  const sections: DescriptionSection[] = [];
  let section: DescriptionSection | null = null;
  let part: DescriptionPart | null = null;
  // 빈 줄은 문단을 끊는다. 다음 글줄은 새 문단으로 시작한다.
  let paragraphOpen = false;

  const currentPart = () => {
    if (!section) {
      section = { title: null, parts: [] };
      sections.push(section);
    }
    if (!part) {
      part = { number: null, title: null, blocks: [] };
      section.parts.push(part);
    }
    return part;
  };

  const push = (block: DescriptionBlock) => {
    const blocks = currentPart().blocks;
    const last = blocks[blocks.length - 1];
    if (last?.kind === 'list' && block.kind === 'list') last.items.push(...block.items);
    else if (last?.kind === 'specs' && block.kind === 'specs') last.specs.push(...block.specs);
    else if (last?.kind === 'text' && block.kind === 'text' && paragraphOpen) last.text += `\n${block.text}`;
    else blocks.push(block);
    paragraphOpen = block.kind === 'text';
  };

  for (const line of lines) {
    if (!line) {
      paragraphOpen = false;
      continue;
    }
    const heading = SECTION_LINE.exec(line);
    if (heading) {
      section = { title: heading[1].trim(), parts: [] };
      sections.push(section);
      part = null;
      paragraphOpen = false;
      continue;
    }
    const partHeading = PART_LINE.exec(line);
    if (partHeading) {
      if (!section) currentPart();
      part = { number: partHeading[1].padStart(2, '0'), title: partHeading[2].trim(), blocks: [] };
      section!.parts.push(part);
      paragraphOpen = false;
      continue;
    }
    const item = LIST_LINE.exec(line);
    const body = item ? item[1].trim() : line;
    const spec = toSpec(body);
    if (spec) push({ kind: 'specs', specs: [spec] });
    else if (item) push({ kind: 'list', items: [body] });
    else push({ kind: 'text', text: line });
  }

  // 제목만 있고 내용이 없는 섹션은 뺀다.
  return sections
    .map(s => ({ ...s, parts: s.parts.filter(p => p.title || p.blocks.length > 0) }))
    .filter(s => s.parts.length > 0);
}
