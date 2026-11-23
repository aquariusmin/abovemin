#!/usr/bin/env node
// 복원은 저장소 밖 디렉터리에서 한다. 푼 JSON은 절대 커밋하지 않는다.
// 운영을 덮어쓰지 않도록 URL은 --url, 키는 RESTORE_SERVICE_ROLE_KEY로만 받고 .env.local은 읽지 않는다.

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  TABLES,
  authHeaders,
  chunk,
  parsePreservingNumbers,
  prepareRowsForRestore,
  sequenceResetSql,
  upsertUrl,
} from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string' },
    url: { type: 'string' },
    apply: { type: 'boolean', default: false },
    'batch-size': { type: 'string', default: '500' },
    only: { type: 'string' },
  },
});

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

if (!args.dir) fail('--dir <extracted backup dir> is required');
if (!args.url) fail('--url <target supabase url> is required (no env fallback, on purpose)');
let target;
try {
  target = new URL(args.url);
} catch {
  fail('--url is not a valid URL');
}
const batchSize = Number(args['batch-size']);
if (!Number.isInteger(batchSize) || batchSize < 1) fail('--batch-size must be a positive integer');
const only = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null;

const dir = path.resolve(args.dir);
let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
} catch {
  fail(`${dir}/manifest.json not found or unreadable — is --dir the extracted abovemin-backup-YYYYMMDD folder?`);
}
const mode = args.apply ? 'APPLY' : 'DRY-RUN';
console.log(`${mode} → ${target.origin}`);
console.log(`backup created_at: ${manifest.created_at}`);
if (manifest.skipped_tables?.length) {
  console.log(`skipped at backup time: ${manifest.skipped_tables.join(', ')}`);
}

let headers;
if (args.apply) {
  const key = process.env.RESTORE_SERVICE_ROLE_KEY;
  if (!key) fail('RESTORE_SERVICE_ROLE_KEY is not set (required with --apply)');
  headers = {
    ...authHeaders(key),
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
}

const plan = [];
for (const table of TABLES) {
  if (only && !only.has(table.name)) continue;
  const file = path.join(dir, `${table.name}.json`);
  try {
    await access(file);
  } catch {
    console.log(`- ${table.name}: no file in backup, skip`);
    continue;
  }
  const rows = parsePreservingNumbers(await readFile(file, 'utf8'));
  if (!Array.isArray(rows)) fail(`${table.name}.json is not an array`);
  const expected = manifest.tables?.[table.name];
  if (expected !== undefined && expected !== rows.length) {
    fail(`${table.name}.json has ${rows.length} rows but manifest says ${expected}`);
  }
  plan.push({ table, rows: prepareRowsForRestore(table, rows) });
}

console.log('\norder (FK dependencies first):');
for (const { table, rows } of plan) {
  const batches = Math.ceil(rows.length / batchSize);
  const omit = table.omitOnRestore?.length ? `, omit ${table.omitOnRestore.join(',')}` : '';
  console.log(
    `  ${table.name}: ${rows.length} rows, ${batches} batch(es), on_conflict=${table.restoreKey ?? table.key}${omit}`,
  );
}

if (args.apply) {
  for (const { table, rows } of plan) {
    let done = 0;
    for (const batch of chunk(rows, batchSize)) {
      const res = await fetch(upsertUrl(target, table), {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        // 로컬 출력이라 오류 본문을 보여 준다(행의 값이 섞일 수 있다).
        const body = await res.text();
        console.error(`\n${table.name}: HTTP ${res.status} after ${done} rows\n${body}`);
        if (body.includes('PGRST204') || body.includes('PGRST205') || body.includes('42P01')) {
          console.error('hint: 스키마가 없다 — schema/tables.sql, migrations/*.sql을 먼저 적용한다.');
        }
        if (body.includes('428C9')) {
          console.error('hint: generated always identity 컬럼에 값을 넣었다 — omitOnRestore를 확인한다.');
        }
        process.exit(1);
      }
      done += batch.length;
    }
    console.log(`  ✓ ${table.name}: ${done} rows`);
  }
} else {
  console.log('\n(dry-run: nothing was sent. add --apply to write.)');
}

console.log(`
after restore, run in the SQL Editor so new inserts don't collide with restored ids:
${sequenceResetSql()}`);
