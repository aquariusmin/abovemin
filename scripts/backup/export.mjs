#!/usr/bin/env node
// 공개 저장소 Actions에서 돈다: 로그에 응답 본문을 찍지 않는다(orders에 고객 정보가 있다).

import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  PAGE_SIZE,
  TABLES,
  authHeaders,
  buildManifest,
  checkTableRows,
  joinJsonArrayPages,
  pageUrl,
  parseContentRange,
  schemaSqlFromOpenApi,
  tablesCreatedByMigrations,
} from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: {
    out: { type: 'string' },
    migrations: { type: 'string', default: path.join(here, '../../supabase/migrations') },
    'page-size': { type: 'string', default: String(PAGE_SIZE) },
  },
});

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

if (!args.out) fail('--out <dir> is required');
const pageSize = Number(args['page-size']);
if (!Number.isInteger(pageSize) || pageSize < 1) fail('--page-size must be a positive integer');
const baseUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl) fail('SUPABASE_URL is not set');
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is not set');
const headers = authHeaders(key);

class HttpError extends Error {
  constructor(status, code) {
    super(`HTTP ${status}${code ? ` (${code})` : ''}`);
    this.status = status;
    this.code = code;
  }
}

// 오류 응답에서 `code`만 꺼낸다. message/details에는 행의 값이 섞일 수 있다.
async function errorCode(res) {
  try {
    const body = await res.json();
    return typeof body?.code === 'string' ? body.code.slice(0, 16) : undefined;
  } catch {
    return undefined;
  }
}

async function getWithRetry(url, extraHeaders = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...headers, Accept: 'application/json', ...extraHeaders },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return res;
      const err = new HttpError(res.status, await errorCode(res));
      if (res.status < 500) throw err;
      lastErr = err;
    } catch (e) {
      if (e instanceof HttpError && e.status < 500) throw e;
      lastErr = e instanceof HttpError ? e : new Error(`network error (${e?.name ?? 'unknown'})`);
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw lastErr;
}

async function exportTable(table) {
  const pages = [];
  let offset = 0;
  let total = null;
  for (;;) {
    const res = await getWithRetry(pageUrl(baseUrl, table.name, table.key, offset, pageSize), {
      Prefer: 'count=exact',
    });
    const range = parseContentRange(res.headers.get('content-range'));
    if (!range) throw new Error(`${table.name}: missing or unparsable Content-Range`);
    const text = await res.text();
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error(`${table.name}: response is not an array`);
    pages.push(text);
    total = range.total;
    offset += rows.length;
    if (offset >= total) break;
    if (rows.length === 0) throw new Error(`${table.name}: empty page before reaching total`);
  }
  const joined = joinJsonArrayPages(pages);
  const rows = JSON.parse(joined);
  return { joined, rows, total };
}

const outDir = path.resolve(args.out);
await mkdir(path.join(outDir, 'migrations'), { recursive: true, mode: 0o700 });
await mkdir(path.join(outDir, 'schema'), { recursive: true, mode: 0o700 });

const counts = {};
const skipped = [];
const failures = [];

for (const table of TABLES) {
  let result;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await exportTable(table);
    } catch (e) {
      result = { error: e };
      if (e instanceof HttpError && e.status < 500) break;
      continue;
    }
    const problems = checkTableRows(table, result.rows, result.total);
    const onlyMin = problems.every((p) => p.includes('expected at least'));
    if (problems.length === 0 || onlyMin) {
      result.problems = problems;
      break;
    }
    result = { error: new Error(problems.join('; ')) };
  }

  if (result.error) {
    const e = result.error;
    const isMissing = e instanceof HttpError && e.status === 404;
    if (isMissing && !table.required) {
      console.warn(`::warning::${table.name}: table not found (${e.message}) — skipped`);
      skipped.push(table.name);
      continue;
    }
    failures.push(`${table.name}: ${e.message}`);
    continue;
  }
  if (result.problems.length) {
    failures.push(...result.problems);
    continue;
  }
  await writeFile(path.join(outDir, `${table.name}.json`), result.joined, { mode: 0o600 });
  counts[table.name] = result.rows.length;
  console.log(`${table.name}: ${result.rows.length} rows`);
}

const migrationFiles = (await readdir(args.migrations)).filter((f) => f.endsWith('.sql')).sort();
const migrationTexts = [];
for (const f of migrationFiles) {
  await copyFile(path.join(args.migrations, f), path.join(outDir, 'migrations', f));
  migrationTexts.push(await readFile(path.join(args.migrations, f), 'utf8'));
}
try {
  const res = await getWithRetry(new URL('/rest/v1/', baseUrl).toString(), {
    Accept: 'application/openapi+json',
  });
  const text = await res.text();
  const openapi = JSON.parse(text);
  await writeFile(path.join(outDir, 'schema', 'openapi.json'), text, { mode: 0o600 });
  const sql = schemaSqlFromOpenApi(openapi, { skip: tablesCreatedByMigrations(migrationTexts) });
  await writeFile(path.join(outDir, 'schema', 'tables.sql'), sql, { mode: 0o600 });
  console.log('schema: openapi.json, tables.sql');
} catch (e) {
  console.warn(`::warning::schema: could not fetch OpenAPI (${e.message}) — data only`);
}

if (failures.length) {
  for (const f of failures) console.error(`::error::${f}`);
  process.exit(1);
}

const manifest = buildManifest({
  createdAt: Date.now(),
  counts,
  skipped,
  migrations: migrationFiles,
});
await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`ok: ${Object.keys(counts).length} tables, ${skipped.length} skipped`);
