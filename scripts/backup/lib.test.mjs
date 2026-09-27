// node --test scripts/backup/lib.test.mjs
//
// frontend의 vitest와 따로 둔다: 이 스크립트는 의존성 없이 Actions에서
// `node`만으로 돌아야 하고, 테스트도 같은 조건에서 돌아야 의미가 있다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLES,
  authHeaders,
  buildManifest,
  checkTableRows,
  chunk,
  joinJsonArrayPages,
  pageUrl,
  parseContentRange,
  parsePreservingNumbers,
  prepareRowsForRestore,
  schemaSqlFromOpenApi,
  sequenceResetSql,
  tablesCreatedByMigrations,
  upsertUrl,
} from './lib.mjs';

const table = (name) => TABLES.find((t) => t.name === name);

test('parseContentRange', () => {
  assert.deepEqual(parseContentRange('0-999/1234'), { start: 0, end: 999, total: 1234 });
  assert.deepEqual(parseContentRange('*/0'), { start: null, end: null, total: 0 });
  assert.equal(parseContentRange('0-9/*'), null);
  assert.equal(parseContentRange(null), null);
  assert.equal(parseContentRange('garbage'), null);
});

test('pageUrl orders by key and paginates', () => {
  const u = new URL(pageUrl('https://x.supabase.co', 'photos', 'id', 2000, 1000));
  assert.equal(u.pathname, '/rest/v1/photos');
  assert.equal(u.searchParams.get('order'), 'id.asc');
  assert.equal(u.searchParams.get('limit'), '1000');
  assert.equal(u.searchParams.get('offset'), '2000');
  assert.equal(u.searchParams.get('select'), '*');
});

test('authHeaders: JWT gets Bearer, sb_secret does not', () => {
  assert.deepEqual(authHeaders('eyJabc'), { apikey: 'eyJabc', Authorization: 'Bearer eyJabc' });
  assert.deepEqual(authHeaders('sb_secret_abc'), { apikey: 'sb_secret_abc' });
  assert.throws(() => authHeaders(''));
});

test('joinJsonArrayPages keeps numeric text exactly', () => {
  const joined = joinJsonArrayPages([
    '[{"id":1,"equity":0.12345678901234567890}]',
    '[]',
    ' [{"id":2}] ',
  ]);
  assert.equal(joined, '[{"id":1,"equity":0.12345678901234567890},{"id":2}]');
  assert.equal(joinJsonArrayPages([]), '[]');
  assert.throws(() => joinJsonArrayPages(['{"code":"PGRST205"}']));
});

test('checkTableRows catches short, duplicate and under-minimum exports', () => {
  const photos = table('photos');
  assert.deepEqual(checkTableRows(photos, [{ id: 1 }, { id: 2 }], 2), []);
  assert.match(checkTableRows(photos, [{ id: 1 }], 2)[0], /fetched 1 rows but server reported 2/);
  assert.match(checkTableRows(photos, [{ id: 1 }, { id: 1 }], 2)[0], /duplicate id/);
  assert.match(checkTableRows(photos, [], 0)[0], /expected at least 1/);
  assert.deepEqual(checkTableRows(table('orders'), [], 0), []);
});

test('checkTableRows never puts row values in messages', () => {
  const orders = table('orders');
  const msgs = checkTableRows(
    orders,
    [{ id: 7, email: 'secret@example.com' }, { id: 7, email: 'secret@example.com' }],
    3,
  );
  assert.ok(msgs.length > 0);
  for (const m of msgs) assert.ok(!m.includes('secret@example.com') && !m.includes('7 '));
});

test('manifest holds only names, counts, timestamp and migration names', () => {
  const m = buildManifest({
    createdAt: Date.UTC(2026, 8, 17, 18, 17),
    counts: { albums: 6, photos: 293 },
    skipped: ['quant_fleet'],
    migrations: ['b.sql', 'a.sql'],
  });
  assert.deepEqual(Object.keys(m).sort(), [
    'created_at',
    'format',
    'migrations',
    'skipped_tables',
    'tables',
  ]);
  assert.equal(m.created_at, '2026-09-17T18:17:00.000Z');
  assert.deepEqual(m.tables, { albums: 6, photos: 293 });
  assert.deepEqual(m.migrations, ['a.sql', 'b.sql']);
  assert.throws(() => buildManifest({ createdAt: 0, counts: { x: -1 }, skipped: [], migrations: [] }));
  assert.throws(() => buildManifest({ createdAt: 0, counts: { x: 'rows' }, skipped: [], migrations: [] }));
});

test('restore order puts albums before photos', () => {
  const names = TABLES.map((t) => t.name);
  assert.ok(names.indexOf('albums') < names.indexOf('photos'));
  assert.deepEqual(
    [...names].sort(),
    ['albums', 'notes', 'orders', 'photos', 'places', 'products', 'quant_fleet', 'site_settings'],
  );
});

test('notes restore drops the always-identity id and upserts on slug', () => {
  const notes = table('notes');
  const rows = prepareRowsForRestore(notes, [{ id: 3, slug: 'a', title: 't' }]);
  assert.deepEqual(rows, [{ slug: 'a', title: 't' }]);
  assert.equal(new URL(upsertUrl('https://x.supabase.co', notes)).searchParams.get('on_conflict'), 'slug');
  const photos = table('photos');
  const same = [{ id: 1 }];
  assert.equal(prepareRowsForRestore(photos, same), same);
});

test('chunk', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
  assert.throws(() => chunk([1], 0));
});

test('parsePreservingNumbers keeps digits JS cannot represent', () => {
  const v = parsePreservingNumbers(
    '{"a":1,"b":37.5,"c":0.12345678901234567890,"d":9007199254740993,"e":[2]}',
  );
  assert.equal(v.a, 1);
  assert.equal(v.b, 37.5);
  assert.equal(v.c, '0.12345678901234567890');
  assert.equal(v.d, '9007199254740993');
  assert.deepEqual(v.e, [2]);
});

test('sequenceResetSql covers serial id tables only', () => {
  const sql = sequenceResetSql();
  for (const t of ['albums', 'photos', 'products', 'orders']) {
    assert.match(sql, new RegExp(`pg_get_serial_sequence\\('public\\.${t}', 'id'\\)`));
  }
  assert.doesNotMatch(sql, /notes|site_settings|places|quant_fleet/);
});

test('tablesCreatedByMigrations', () => {
  const names = tablesCreatedByMigrations([
    'create table if not exists public.places (name text);',
    'CREATE TABLE public.notes (id bigint);',
    'alter table public.photos add column x int;',
  ]);
  assert.deepEqual([...names].sort(), ['notes', 'places']);
});

test('schemaSqlFromOpenApi drafts base tables and skips migration-owned ones', () => {
  const openapi = {
    definitions: {
      albums: {
        required: ['id', 'slug'],
        properties: {
          id: { format: 'integer', description: 'Note:\nThis is a Primary Key.<pk/>' },
          slug: { format: 'text' },
          published: { format: 'boolean', default: true },
          created_at: { format: 'timestamp with time zone', default: 'now()' },
        },
      },
      photos: {
        required: ['id', 'album_slug'],
        properties: {
          id: { format: 'integer', description: '<pk/>' },
          album_slug: { format: 'text', description: "<fk table='albums' column='slug'/>" },
          status: { format: 'text', default: "it's" },
        },
      },
    },
  };
  openapi.definitions.products = {
    required: ['id'],
    properties: { id: { format: 'integer', description: '<pk/>' } },
  };
  const sql = schemaSqlFromOpenApi(openapi, { skip: new Set(['notes']) });
  assert.match(
    sql,
    /alter table public\.products enable row level security;\ncreate policy "public read products"/,
  );
  assert.doesNotMatch(sql, /policy[^\n]*public\.orders/);
  assert.match(sql, /create table if not exists public\.albums \(/);
  assert.match(sql, /id integer generated by default as identity not null/);
  assert.match(sql, /published boolean default true/);
  assert.match(sql, /created_at timestamp with time zone default now\(\)/);
  assert.match(sql, /status text default 'it''s'/);
  assert.match(sql, /foreign key \(album_slug\) references public\.albums \(slug\)/);
  assert.match(sql, /-- notes: migrations\//);
  assert.ok(sql.indexOf('public.albums (') < sql.indexOf('public.photos ('));
});
