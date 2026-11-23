#!/usr/bin/env node
// main(=운영 배포)을 갱신할 push를 막는다. git dry-run으로 대상 ref를 묻고, 모르면 막는다.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const block = (why) => {
  process.stderr.write(
    `차단: ${why}\n` +
      'main 푸시는 곧 프로덕션 배포입니다. 기능 브랜치를 만들어 ' +
      '`git push -u origin <branch>` → `gh pr create --base main`으로 진행하세요.\n',
  );
  process.exit(2);
};

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '';
} catch {
  block('훅 입력을 읽지 못했습니다.');
}

if (!/\bgit\b[\s\S]*\bpush\b/.test(command)) process.exit(0);

function tokenize(text) {
  const tokens = [];
  let cur = '';
  let quote = null;
  let has = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < text.length) cur += text[++i];
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    // 리다이렉션(`2>&1`, `>/dev/null`)은 git 인자가 아니므로 버린다.
    if (c === '>' || c === '<') {
      if (/^\d+$/.test(cur)) { cur = ''; has = false; }
      if (has) { tokens.push(cur); cur = ''; has = false; }
      if (text[i + 1] === c) i++;
      if (text[i + 1] === '&') {
        i++;
        while (i + 1 < text.length && /[\d-]/.test(text[i + 1])) i++;
        continue;
      }
      while (i + 1 < text.length && /[ \t]/.test(text[i + 1])) i++;
      while (i + 1 < text.length && !/[\s;|&<>]/.test(text[i + 1])) i++;
      continue;
    }
    if (c === '\\' && i + 1 < text.length) { cur += text[++i]; has = true; continue; }
    if (/\s/.test(c) && c !== '\n') { if (has) tokens.push(cur); cur = ''; has = false; continue; }
    if (c === ';' || c === '|' || c === '&' || c === '\n') {
      if (has) tokens.push(cur);
      cur = ''; has = false;
      tokens.push({ sep: c });
      continue;
    }
    cur += c; has = true;
  }
  if (has) tokens.push(cur);
  return tokens;
}

const tokens = tokenize(command);
const segments = [[]];
for (const t of tokens) {
  if (typeof t === 'object') segments.push([]);
  else segments[segments.length - 1].push(t);
}

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();

for (const words of segments) {
  const g = words.indexOf('git');
  if (g === -1) continue;
  let p = g + 1;
  while (p < words.length && words[p].startsWith('-')) p += words[p] === '-C' || words[p] === '-c' ? 2 : 1;
  if (words[p] !== 'push') continue;
  if (words.slice(g).some((w) => /\$|`/.test(w))) block('푸시 명령에 셸 확장이 있어 대상을 확인할 수 없습니다.');

  const globalOpts = words.slice(g + 1, p);
  // `-q`는 dry-run의 porcelain 출력까지 숨긴다.
  const pushArgs = words.slice(p + 1).filter((a) => a !== '-q' && a !== '--quiet');
  if (pushArgs.includes('--all') || pushArgs.includes('--mirror')) block('`--all`/`--mirror`는 main까지 함께 푸시합니다.');

  let output = '';
  try {
    output = execFileSync('git', [...globalOpts, 'push', '--dry-run', '--porcelain', ...pushArgs], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 8000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
  } catch (error) {
    output = typeof error?.stdout === 'string' ? error.stdout : '';
  }

  const refLines = output.split('\n').filter((line) => /^[ +\-*=!]\t/.test(line));
  if (refLines.length === 0) block('푸시가 갱신할 ref를 확인하지 못했습니다(dry-run 실패).');
  for (const line of refLines) {
    const dst = line.split('\t')[1]?.split(':').pop();
    if (dst === 'refs/heads/main') block(`\`${words.slice(g).join(' ')}\`이 main을 갱신합니다.`);
  }
}
