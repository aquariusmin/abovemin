#!/usr/bin/env node
// PreToolUse(Bash) 훅: `main`으로 가는 `git push`를 막는다.
//
// main은 Vercel에 물려 있어 푸시가 곧 프로덕션 배포다. 권한 규칙
// (`Bash(git push * main)`)은 명령 글자만 보므로, 브랜치를 적지 않은
// `git push`가 main으로 가는 경우를 잡지 못한다:
//   - 지금 브랜치가 main일 때
//   - 지금 브랜치의 upstream이 origin/main일 때(2026-08-24 lab-palette에서 실제로 있었다)
// 이 훅은 그 두 경우와, refspec에 main을 직접 적은 경우를 모두 막는다.
//
// 종료 코드 2 = 차단(표준 오류가 Claude에게 전달된다). 그 밖에는 조용히 통과.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let command = '';
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '';
} catch {
  process.exit(0);
}

// `git push`, `git -C dir push`, `git -c k=v push`를 모두 잡는다.
const PUSH = /\bgit\b(?:\s+-[cC]\s+\S+|\s+--[\w-]+(?:=\S+)?)*\s+push\b([^;&|\n]*)/g;

const git = (...args) => {
  try {
    return execFileSync('git', args, {
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const block = (why) => {
  process.stderr.write(
    `차단: ${why}\n` +
      'main 푸시는 곧 프로덕션 배포입니다. 기능 브랜치를 만들어 ' +
      '`git push -u origin <branch>` → `gh pr create --base main`으로 진행하세요.\n',
  );
  process.exit(2);
};

for (const match of command.matchAll(PUSH)) {
  const args = match[1].trim().split(/\s+/).filter(Boolean);
  const positional = args.filter((a) => !a.startsWith('-'));
  const refspecs = positional.slice(1); // [remote, ...refspecs]

  // 1) refspec에 main을 직접 적은 경우: `origin main`, `HEAD:main`, `+main`, `refs/heads/main`
  const targetsMain = refspecs.some((r) => {
    const dst = r.replace(/^\+/, '').split(':').pop();
    return dst === 'main' || dst === 'refs/heads/main';
  });
  if (targetsMain) block(`\`${match[0].trim()}\`이 main을 대상으로 합니다.`);

  if (args.includes('--all') || args.includes('--mirror')) {
    block('`--all`/`--mirror`는 main까지 함께 푸시합니다.');
  }

  // 2) refspec이 없으면 git이 현재 브랜치와 upstream으로 대상을 정한다.
  if (refspecs.length === 0) {
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
    if (branch === 'main') block('지금 브랜치가 main입니다.');
    const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
    if (upstream === 'origin/main') {
      block(`\`${branch}\` 브랜치의 upstream이 origin/main이라 그대로 푸시하면 main으로 갑니다.`);
    }
  }
}
