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
