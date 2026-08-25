#!/usr/bin/env node
/**
 * 아카이브 사진 일괄 업로드 (CLI).
 *
 *   npm run photos:add -- --album=korea --location=Seoul ./photos/*.jpg
 *
 * 하는 일은 /admin의 업로드 위젯과 같다: Cloudinary에 올리고 `photos` 행을
 * 만든다. 다만 이쪽은 수백 장을 한 번에 밀어 넣을 때를 위한 것이라 확인 화면이
 * 없다 — 먼저 `--dry-run`으로 무엇이 들어갈지 보고 실행하는 것을 권한다.
 *
 * 옵션
 *   --album=<slug>      (필수) 대상 앨범
 *   --location=<text>   모든 사진의 장소. 생략하면 빈 값
 *   --year=<yyyy>       모든 사진의 연도. 생략하면 EXIF 촬영일 → 없으면 올해
 *   --dry-run           업로드도 저장도 하지 않고 계획만 출력
 *
 * 필요한 환경변수 (.env.local): CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
 * CLOUDINARY_API_SECRET / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import { createHash } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { basename } from 'node:path';
import { stat } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

/** 동시 업로드 수. 원본 사진은 장당 수 MB라 무제한으로 열면 회선만 막힌다. */
const CONCURRENCY = 3;

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

// ── 인자 ──────────────────────────────────────────────────────────────────────

const options = { album: '', location: '', year: '', dryRun: false };
const files = [];

for (const arg of process.argv.slice(2)) {
  if (arg === '--dry-run') options.dryRun = true;
  else if (arg.startsWith('--album=')) options.album = arg.slice(8);
  else if (arg.startsWith('--location=')) options.location = arg.slice(11);
  else if (arg.startsWith('--year=')) options.year = arg.slice(7);
  else if (arg.startsWith('--')) fail(`알 수 없는 옵션: ${arg}`);
  else files.push(arg);
}

if (!/^[a-z0-9-]{1,64}$/.test(options.album)) {
  fail('--album=<slug> 이 필요합니다. 예: --album=korea');
}
if (files.length === 0) fail('업로드할 파일을 하나 이상 지정하세요.');
if (options.year && !/^\d{4}$/.test(options.year)) fail('--year 는 네 자리 연도여야 합니다.');

// ── 환경변수 ──────────────────────────────────────────────────────────────────

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [
  !cloudName && 'CLOUDINARY_CLOUD_NAME',
  !apiKey && 'CLOUDINARY_API_KEY',
  !apiSecret && 'CLOUDINARY_API_SECRET',
  !supabaseUrl && 'SUPABASE_URL',
  !supabaseKey && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean);
if (missing.length > 0) fail(`.env.local 에 다음이 없습니다: ${missing.join(', ')}`);

// ── Cloudinary ────────────────────────────────────────────────────────────────

/** `src/lib/cloudinary-upload.ts`의 서명 규칙과 동일 — 바꿀 때 함께 고칠 것. */
function signUploadParams(params) {
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

function titleFromFileName(name) {
  const base = basename(name).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return (base || 'Untitled').slice(0, 200);
}

function exifYear(metadata) {
  const meta = metadata ?? {};
  for (const key of ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime', 'CreateDate']) {
    const value = meta[key];
    if (typeof value === 'string') {
      const match = value.match(/(\d{4})/);
      if (match) return Number(match[1]);
    }
  }
  return new Date().getFullYear();
}

async function upload(path) {
  const params = {
    folder: `phorage/archive/${options.album}`,
    image_metadata: 'true',
    timestamp: Math.floor(Date.now() / 1000),
  };

  const form = new FormData();
  form.append('file', await openAsBlob(path), basename(path));
  form.append('api_key', apiKey);
  form.append('signature', signUploadParams(params));
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.secure_url) {
    throw new Error(body?.error?.message ?? `업로드 실패 (${res.status})`);
  }
  return body;
}

// ── 실행 ──────────────────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: album } = await supabase
  .from('albums')
  .select('slug, title')
  .eq('slug', options.album)
  .maybeSingle();
if (!album) fail(`'${options.album}' 앨범이 없습니다.`);

for (const path of files) {
  try {
    await stat(path);
  } catch {
    fail(`파일을 찾을 수 없습니다: ${path}`);
  }
}

const { data: last, error: orderError } = await supabase
  .from('photos')
  .select('sort_order')
  .eq('album_slug', options.album)
  .order('sort_order', { ascending: false })
  .limit(1)
  .maybeSingle();
if (orderError) fail(`정렬 순서를 읽지 못했습니다: ${orderError.message}`);
const startOrder = (last?.sort_order ?? 0) + 1;

console.log(`\n  ${album.title} (${options.album}) — ${files.length}장, sort_order ${startOrder}부터\n`);

if (options.dryRun) {
  files.forEach((path, i) => {
    console.log(`  ${String(startOrder + i).padStart(3)}  ${titleFromFileName(path)}  ${basename(path)}`);
  });
  console.log(`\n  --dry-run: 아무것도 업로드하지 않았습니다.\n`);
  process.exit(0);
}

// 결과를 인자 순서 그대로 유지해야 sort_order가 파일 순서와 맞는다.
const results = new Array(files.length).fill(null);
const failures = [];
let cursor = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= files.length) return;
    const path = files[index];
    try {
      const uploaded = await upload(path);
      results[index] = {
        album_slug: options.album,
        src: uploaded.secure_url,
        title: titleFromFileName(path),
        location: options.location,
        year: options.year ? Number(options.year) : exifYear(uploaded.image_metadata),
      };
      console.log(`  ✓ ${basename(path)}`);
    } catch (error) {
      failures.push({ path, message: error.message });
      console.log(`  ✗ ${basename(path)} — ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

const rows = results
  .filter(Boolean)
  .map((row, i) => ({ ...row, sort_order: startOrder + i }));

if (rows.length === 0) fail('업로드에 성공한 사진이 없습니다.');

const { error: insertError } = await supabase.from('photos').insert(rows);
if (insertError) {
  // 파일은 Cloudinary에 올라갔지만 DB 행이 없다 — 그대로 두면 유령 자산이 된다.
  console.error('\n  업로드된 URL (수동 복구용):');
  for (const row of rows) console.error(`    ${row.src}`);
  fail(`DB 저장 실패: ${insertError.message}`);
}

console.log(`\n  ${rows.length}장을 ${album.title} 앨범에 추가했습니다.`);
if (failures.length > 0) console.log(`  실패 ${failures.length}장은 다시 시도해 주세요.`);
console.log('');
