/**
 * 상품 설명(관리 화면의 자유 입력)에서 "항목: 값" 줄을 사양으로 떼어 낸다.
 *
 * 설명에는 이야기와 사양이 한 덩어리로 들어 있다 — "2027 Calendar", 빈 줄,
 * "사이즈(가로*세로)(mm): 148 * 238", "용지 두께 : 250gsm". 사양을 문단으로
 * 읽게 두면 숫자를 비교하기 어렵다. 콜론 앞이 짧은 줄만 사양으로 보고, 나머지는
 * 쓰인 순서 그대로 이야기로 남긴다. 입력 칸은 그대로이고, 아무 줄도 맞지 않으면
 * 예전과 똑같이 보인다.
 */
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
