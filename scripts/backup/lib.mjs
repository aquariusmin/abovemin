// 공개 저장소: 로그·매니페스트에는 테이블 이름과 행 수만 내보내고 행의 값은 절대 내보내지 않는다.

// 배열 순서 = 복원 순서(FK). required:false는 없으면(404) 건너뛴다(나중에 생긴 테이블·NAS가 쓰는 테이블).
// notes.id는 identity라 id를 빼고 slug로 upsert한다. orders는 RLS 정책 없음(service-role 전용, 고객 정보).
export const TABLES = [
  { name: 'albums', key: 'id', required: true, minRows: 1, serialId: true },
  { name: 'photos', key: 'id', required: true, minRows: 1, serialId: true },
  {
    name: 'products',
    key: 'id',
    required: true,
    minRows: 0,
    serialId: true,
    policies: ['create policy "public read products" on public.products for select using (true);'],
  },
  { name: 'orders', key: 'id', required: true, minRows: 0, serialId: true },
  {
    name: 'site_settings',
    key: 'key',
    required: true,
    minRows: 0,
    policies: ['create policy "Allow public read" on public.site_settings for select using (true);'],
  },
  { name: 'places', key: 'name', required: false, minRows: 0 },
  {
    name: 'notes',
    key: 'id',
    required: false,
    minRows: 0,
    restoreKey: 'slug',
    omitOnRestore: ['id'],
  },
  {
    name: 'quant_fleet',
    key: 'id',
    required: false,
    minRows: 0,
    policies: [
      'create policy "Allow public read" on public.quant_fleet for select using (true);',
      `create policy "Allow service write" on public.quant_fleet for all using (auth.role() = 'service_role');`,
    ],
  },
];

export const PAGE_SIZE = 1000;

export function parseContentRange(header) {
  if (typeof header !== 'string') return null;
  const m = /^\s*(?:(\d+)-(\d+)|\*)\/(\d+)\s*$/.exec(header);
  if (!m) return null;
  return {
    start: m[1] === undefined ? null : Number(m[1]),
    end: m[2] === undefined ? null : Number(m[2]),
    total: Number(m[3]),
  };
}

export function pageUrl(baseUrl, table, key, offset, limit = PAGE_SIZE) {
  const u = new URL(`/rest/v1/${encodeURIComponent(table)}`, baseUrl);
  u.searchParams.set('select', '*');
  u.searchParams.set('order', `${key}.asc`);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('offset', String(offset));
  return u.toString();
}

// 새 비밀 키(sb_…)는 JWT가 아니라 Bearer에 넣으면 거절되므로 apikey에만 넣는다.
export function authHeaders(key) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('service-role key is empty');
  }
  const k = key.trim();
  return k.startsWith('sb_')
    ? { apikey: k }
    : { apikey: k, Authorization: `Bearer ${k}` };
}

// numeric 자릿수가 깎이지 않도록 파싱 없이 원문 텍스트를 잇는다.
export function joinJsonArrayPages(pages) {
  const inner = [];
  for (const page of pages) {
    const t = page.trim();
    if (!t.startsWith('[') || !t.endsWith(']')) {
      throw new Error('page body is not a JSON array');
    }
    const body = t.slice(1, -1).trim();
    if (body !== '') inner.push(body);
  }
  return `[${inner.join(',')}]`;
}

// 사유에 행의 값을 넣지 않는다 — 워크플로 로그는 공개다.
export function checkTableRows(table, rows, reportedTotal) {
  const problems = [];
  if (!Array.isArray(rows)) return [`${table.name}: response is not an array`];
  if (rows.length !== reportedTotal) {
    problems.push(
      `${table.name}: fetched ${rows.length} rows but server reported ${reportedTotal}`,
    );
  }
  const seen = new Set();
  let dupes = 0;
  let missingKey = 0;
  for (const row of rows) {
    const v = row?.[table.key];
    if (v === undefined || v === null) {
      missingKey++;
      continue;
    }
    const s = String(v);
    if (seen.has(s)) dupes++;
    seen.add(s);
  }
  if (missingKey) problems.push(`${table.name}: ${missingKey} rows without ${table.key}`);
  if (dupes) problems.push(`${table.name}: ${dupes} duplicate ${table.key} values across pages`);
  if (rows.length < table.minRows) {
    problems.push(`${table.name}: ${rows.length} rows, expected at least ${table.minRows}`);
  }
  return problems;
}

// 암호화하지 않는 매니페스트: 테이블 이름·행 수·시각·마이그레이션 이름만. 넓히지 않는다.
export function buildManifest({ createdAt, counts, skipped, migrations }) {
  const tables = {};
  for (const [name, rows] of Object.entries(counts)) {
    if (!Number.isInteger(rows) || rows < 0) throw new Error(`bad row count for ${name}`);
    tables[name] = rows;
  }
  return {
    format: 1,
    created_at: new Date(createdAt).toISOString(),
    tables,
    skipped_tables: [...skipped].map(String).sort(),
    migrations: [...migrations].map(String).sort(),
  };
}

export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('chunk size must be >= 1');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function parsePreservingNumbers(text) {
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value === 'number' && context && typeof context.source === 'string') {
      if (!Number.isSafeInteger(value) && String(value) !== context.source) return context.source;
    }
    return value;
  });
}

export function prepareRowsForRestore(table, rows) {
  const omit = table.omitOnRestore ?? [];
  if (omit.length === 0) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of omit) delete copy[col];
    return copy;
  });
}

export function upsertUrl(baseUrl, table) {
  const u = new URL(`/rest/v1/${encodeURIComponent(table.name)}`, baseUrl);
  u.searchParams.set('on_conflict', table.restoreKey ?? table.key);
  return u.toString();
}

export function sequenceResetSql(tables = TABLES) {
  return tables
    .filter((t) => t.serialId)
    .map(
      (t) =>
        `select setval(pg_get_serial_sequence('public.${t.name}', '${t.key}'), ` +
        `coalesce(max(${t.key}), 1), max(${t.key}) is not null) from public.${t.name};`,
    )
    .join('\n');
}

export function tablesCreatedByMigrations(sqlTexts) {
  const names = new Set();
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  for (const sql of sqlTexts) {
    for (const m of sql.matchAll(re)) names.add(m[1].toLowerCase());
  }
  return names;
}

function sqlDefault(value, format) {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  if (/^[a-z_][a-z0-9_.]*\(.*\)$/i.test(value)) return value;
  if (/^(integer|bigint|smallint|numeric|real|double precision)$/.test(format ?? '') && /^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "''")}'`;
}

export function schemaSqlFromOpenApi(openapi, { skip = new Set(), tables = TABLES } = {}) {
  const defs = openapi?.definitions ?? {};
  const lines = [
    '-- 자동 생성 초안: PostgREST OpenAPI에서 복원한 기본 테이블 모양.',
    '-- ⚠️ 검토 후 실행한다. 인덱스·트리거·check/unique 제약은 포함되지 않는다.',
    '--    RLS 정책은 2026-09-17 기준으로 스크립트에 적어 둔 것만 들어간다.',
    '--    이 파일 다음에 migrations/*.sql을 파일 이름 순서대로 적용한다.',
    '',
  ];
  for (const t of tables) {
    if (skip.has(t.name)) {
      lines.push(`-- ${t.name}: migrations/가 만든다 — 여기서는 건너뜀`, '');
      continue;
    }
    const def = defs[t.name];
    if (!def) {
      lines.push(`-- ${t.name}: OpenAPI에 정의가 없음`, '');
      continue;
    }
    const required = new Set(def.required ?? []);
    const cols = [];
    const pks = [];
    const fks = [];
    for (const [col, prop] of Object.entries(def.properties ?? {})) {
      const desc = prop.description ?? '';
      const isPk = desc.includes('<pk/>');
      const format = prop.format ?? 'text';
      const type = format;
      let extra = '';
      if (isPk) pks.push(col);
      if (isPk && col === 'id' && (format === 'integer' || format === 'bigint')) {
        extra = ' generated by default as identity';
      } else if (prop.default !== undefined) {
        const d = sqlDefault(prop.default, format);
        if (d !== null) extra = ` default ${d}`;
      }
      const notNull = required.has(col) || isPk ? ' not null' : '';
      cols.push(`  ${col} ${type}${extra}${notNull}`);
      const fk = /<fk table='([a-z_][a-z0-9_]*)' column='([a-z_][a-z0-9_]*)'\/>/i.exec(desc);
      if (fk) fks.push({ col, table: fk[1], column: fk[2] });
    }
    if (pks.length) cols.push(`  primary key (${pks.join(', ')})`);
    lines.push(`create table if not exists public.${t.name} (`, cols.join(',\n'), ');');
    for (const fk of fks) {
      lines.push(
        `-- FK 대상 컬럼이 기본키가 아니면 먼저 unique가 필요하다.`,
        `create unique index if not exists ${fk.table}_${fk.column}_key on public.${fk.table} (${fk.column});`,
        `alter table public.${t.name} add constraint ${t.name}_${fk.col}_fkey foreign key (${fk.col}) references public.${fk.table} (${fk.column});`,
      );
    }
    lines.push(`alter table public.${t.name} enable row level security;`);
    for (const policy of t.policies ?? []) lines.push(policy);
    lines.push('');
  }
  return lines.join('\n');
}
