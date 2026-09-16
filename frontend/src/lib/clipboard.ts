/**
 * 문자열을 클립보드에 넣는다. 성공 여부를 돌려준다.
 *
 * 라이트박스와 사진 페이지의 "링크 복사"가 같이 쓴다. 브라우저 전용이다 —
 * 클릭 핸들러에서만 부른다.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API는 보안 컨텍스트와 권한이 필요하다(인앱 브라우저,
    // 오래된 iOS). 그때는 선택 영역 복사로 한 번 더 시도한다.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    field.remove();
    return ok;
  }
}
