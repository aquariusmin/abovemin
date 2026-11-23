#!/usr/bin/env node
// 업로드 전에 GPS·위치 메타데이터를 지운다(exif-strip.ts). 지울 수 없는 파일은 올리지 않는다.

import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { planUpload } from '../src/lib/exif-strip.ts';
import { groupCoordsByPlace, placeFromCoords } from '../src/lib/admin/photo-metadata.ts';

const CONCURRENCY = 3;

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

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

// `src/lib/cloudinary-upload.ts`의 서명 규칙과 같다 — 함께 고친다.
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

const PRIVACY_LABEL = { removed: '위치 정보 제거됨', none: '위치 정보 없음' };
const BLOCKED_MESSAGE = '위치 정보가 들어 있는데 무손실로 지울 수 없는 형식입니다 — JPEG로 내보낸 뒤 다시 올려 주세요';

async function prepare(path) {
  const bytes = new Uint8Array(await readFile(path));
  const plan = planUpload(bytes);
  if (plan.kind === 'jpeg') {
    return { bytes: plan.bytes, coord: plan.coord, privacy: plan.locationRemoved ? 'removed' : 'none' };
  }
  if (plan.kind === 'unchanged') return { bytes, coord: null, privacy: 'none' };
  return null;
}

async function upload(path, bytes) {
  const params = {
    folder: `phorage/archive/${options.album}`,
    image_metadata: 'true',
    timestamp: Math.floor(Date.now() / 1000),
  };

  const form = new FormData();
  form.append('file', new Blob([bytes]), basename(path));
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
  for (const [i, path] of files.entries()) {
    const prepared = await prepare(path);
    const privacy = prepared ? PRIVACY_LABEL[prepared.privacy] : `올리지 않음 — ${BLOCKED_MESSAGE}`;
    console.log(`  ${String(startOrder + i).padStart(3)}  ${titleFromFileName(path)}  ${basename(path)}  (${privacy})`);
  }
  console.log(`\n  --dry-run: 아무것도 업로드하지 않았습니다.\n`);
  process.exit(0);
}

const results = new Array(files.length).fill(null);
const failures = [];
let cursor = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= files.length) return;
    const path = files[index];
    try {
      const prepared = await prepare(path);
      if (!prepared) throw new Error(BLOCKED_MESSAGE);
      const uploaded = await upload(path, prepared.bytes);
      results[index] = {
        row: {
          album_slug: options.album,
          src: uploaded.secure_url,
          title: titleFromFileName(path),
          location: options.location,
          year: options.year ? Number(options.year) : exifYear(uploaded.image_metadata),
        },
        coord: prepared.coord,
      };
      console.log(`  ✓ ${basename(path)}  (${PRIVACY_LABEL[prepared.privacy]})`);
    } catch (error) {
      failures.push({ path, message: error.message });
      console.log(`  ✗ ${basename(path)} — ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

const uploadedResults = results.filter(Boolean);
const rows = uploadedResults.map(({ row }, i) => ({ ...row, sort_order: startOrder + i }));

if (rows.length === 0) fail('업로드에 성공한 사진이 없습니다.');

const { error: insertError } = await supabase.from('photos').insert(rows);
if (insertError) {
  console.error('\n  업로드된 URL (수동 복구용):');
  for (const row of rows) console.error(`    ${row.src}`);
  fail(`DB 저장 실패: ${insertError.message}`);
}

console.log(`\n  ${rows.length}장을 ${album.title} 앨범에 추가했습니다.`);

const place = options.location.trim();
const coordsByPlace = groupCoordsByPlace(
  uploadedResults.map(({ coord }) => ({ place: place && !['-', '—', '–'].includes(place) ? place : null, coord })),
);
for (const [name, coords] of coordsByPlace) {
  const coord = placeFromCoords(coords);
  if (!coord) continue;
  const { data: added, error: placeError } = await supabase
    .from('places')
    .upsert([{ name, lat: coord.lat, lng: coord.lng, source: 'gps' }], { onConflict: 'name', ignoreDuplicates: true })
    .select('name');
  if (placeError) console.log(`  장소 좌표는 건너뛰었습니다: ${placeError.message}`);
  else if (added?.length) console.log(`  장소 좌표를 추가했습니다: ${name} (${coord.lat}, ${coord.lng})`);
}
if (failures.length > 0) console.log(`  실패 ${failures.length}장은 다시 시도해 주세요.`);
console.log('');
