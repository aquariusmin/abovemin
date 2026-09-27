// 백업·복원 스크립트가 공유하는 순수 로직. 네트워크도 파일시스템도 만지지
// 않으므로 `node --test scripts/backup/lib.test.mjs`로 바로 검증된다.
//
// 이 저장소는 공개 저장소다. 여기 있는 함수는 **행의 값**을 로그나 매니페스트로
// 내보내지 않는다 — 내보내는 것은 테이블 이름과 행 수뿐이다.

/**
 * 백업 대상 테이블. 배열 순서가 곧 복원 순서다(FK 의존 순서).
 *
 * - `key`: 페이지를 안정적으로 넘기기 위한 정렬 키이자 복원 시 upsert의
 *   `on_conflict`. 기본키다(2026-09-17 PostgREST OpenAPI로 확인).
 * - `required`: 없으면 백업 전체를 실패시킨다. false면 404(테이블 없음)일 때
 *   경고만 남기고 건너뛴다 — 마이그레이션으로 나중에 생긴 테이블이거나(places,
 *   notes) 외부(NAS)가 쓰는 테이블이다(quant_fleet).
 * - `minRows`: 이보다 적으면 "빈 백업이 성공처럼 보이는" 사고로 보고 실패시킨다.
 * - `restoreKey`/`omitOnRestore`: notes.id는 `generated always as identity`라
 *   PostgREST로 id를 넣으면 거절된다(428C9). id를 빼고 unique인 slug로 upsert
 *   한다. notes.id를 참조하는 곳은 없으므로 번호가 바뀌어도 안전하다.
 * - `serialId`: `nextval(...)` 기본값을 쓰는 id. id를 명시해 넣으면 시퀀스가
 *   따라오지 않으므로 복원 후 setval이 필요하다.
 * - `policies`: 대시보드에서 만든 RLS 정책(2026-09-17 pg_policies로 확인).
 *   OpenAPI에도 마이그레이션에도 없으므로 DDL 초안에 이것을 적는다. albums·photos
 *   정책은 admin_studio 마이그레이션이 다시 만들고, orders는 정책이 없다(=
 *   service-role만 읽고 쓴다 — 고객 정보라서).
 */
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

/**
 * PostgREST `Content-Range` 헤더를 읽는다.
 * "0-999/1234" → { start: 0, end: 999, total: 1234 }
 * "*\/0"        → { start: null, end: null, total: 0 }
 * total이 "*"(count를 요청하지 않음)이거나 형식이 다르면 null.
 */
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

/** 한 페이지를 읽는 REST URL. 정렬 키가 없으면 페이지 사이에 행이 겹치거나 빠진다. */
export function pageUrl(baseUrl, table, key, offset, limit = PAGE_SIZE) {
  const u = new URL(`/rest/v1/${encodeURIComponent(table)}`, baseUrl);
  u.searchParams.set('select', '*');
  u.searchParams.set('order', `${key}.asc`);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('offset', String(offset));
  return u.toString();
}

/**
 * Supabase 키에 맞는 인증 헤더. 옛 JWT 키(eyJ…)는 apikey와 Bearer 둘 다
 * 보내고, 새 비밀 키(sb_secret_…)는 JWT가 아니라 Bearer에 넣으면 거절되므로
 * apikey에만 넣는다.
 */
export function authHeaders(key) {
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('service-role key is empty');
  }
  const k = key.trim();
  return k.startsWith('sb_')
    ? { apikey: k }
    : { apikey: k, Authorization: `Bearer ${k}` };
}

/**
 * 페이지별 응답 본문(JSON 배열 텍스트)을 파싱·재직렬화 없이 한 배열로 잇는다.
 * `numeric` 컬럼(quant_fleet 등)은 JS number로 파싱하면 자릿수가 깎이므로,
 * 원문 텍스트를 그대로 보존한다.
 */
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

/**
 * 다 받은 행이 완전한지 확인한다. 실패 사유 문자열 배열을 돌려준다(빈 배열 = 통과).
 * 사유에는 행의 값을 넣지 않는다 — 워크플로 로그는 공개다.
 */
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

/**
 * 암호화하지 않고 올리는 매니페스트. **테이블 이름, 행 수, 시각, 마이그레이션
 * 파일 이름만** 담는다. 이 모양을 넓히지 말 것 — 테스트가 키 목록을 고정한다.
 */
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

/** 배열을 n개씩 자른다. */
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('chunk size must be >= 1');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * JSON.parse인데, 숫자 원문이 JS number로 정확히 표현되지 않으면 원문 문자열로
 * 남긴다(예: numeric 0.12345678901234567890). PostgREST는 numeric 컬럼에 문자열을
 * 받아 캐스팅하므로, 복원 때 자릿수가 깎이지 않는다. Node 21+의 reviver context.
 */
export function parsePreservingNumbers(text) {
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value === 'number' && context && typeof context.source === 'string') {
      // 안전한 정수는 그대로 둔다(정수 컬럼에 "1.0" 같은 문자열을 보내지 않도록).
      if (!Number.isSafeInteger(value) && String(value) !== context.source) return context.source;
    }
    return value;
  });
}

/** 복원용으로 행을 다듬는다: `omitOnRestore` 컬럼을 뺀다. */
export function prepareRowsForRestore(table, rows) {
  const omit = table.omitOnRestore ?? [];
  if (omit.length === 0) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of omit) delete copy[col];
    return copy;
  });
}

/** 복원 upsert 요청 URL. */
export function upsertUrl(baseUrl, table) {
  const u = new URL(`/rest/v1/${encodeURIComponent(table.name)}`, baseUrl);
  u.searchParams.set('on_conflict', table.restoreKey ?? table.key);
  return u.toString();
}

/** id를 명시해 넣은 뒤 시퀀스를 max(id)로 맞추는 SQL. SQL Editor에서 실행한다. */
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

/** 마이그레이션 SQL에서 `create table [if not exists] public.X`로 만드는 테이블 이름들. */
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
  // "now()", "gen_random_uuid()" 같은 식은 그대로, 나머지는 문자열 리터럴.
  if (/^[a-z_][a-z0-9_.]*\(.*\)$/i.test(value)) return value;
  if (/^(integer|bigint|smallint|numeric|real|double precision)$/.test(format ?? '') && /^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * PostgREST OpenAPI(`GET /rest/v1/`)로부터 **기본 테이블 DDL 초안**을 만든다.
 *
 * 왜 필요한가: albums·photos·products·orders·site_settings·quant_fleet는
 * 대시보드에서 만든 테이블이라 `supabase/migrations/`에 create table이 없다.
 * pg_dump를 쓸 수 없으므로(DB 비밀번호 없음) 새 프로젝트에 테이블을 다시 세울
 * 근거가 이것뿐이다.
 *
 * 한계(주석으로도 파일에 적는다): 인덱스, 트리거, check 제약, unique 제약,
 * 시퀀스/identity 구분은 OpenAPI에 없다. RLS 정책은 `TABLES[].policies`에 손으로
 * 적어 둔 것만 들어간다. 정수 기본키 `id`는
 * `generated by default as identity`로 적는다 — 명시한 id를 받아 주고, 복원 후
 * setval로 맞출 수 있는 형태다. 마이그레이션이 만드는 테이블은 건너뛴다.
 */
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
