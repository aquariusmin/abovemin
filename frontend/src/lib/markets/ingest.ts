import { createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';

/**
 * Upload contract for /api/lab/markets/ingest. Pure — the route handler adds
 * the storage write. The producer is the owner's PC (`publish.py`), which holds
 * only MI_PUBLISH_TOKEN: it can replace these three files and nothing else. The
 * service-role key never leaves Vercel.
 */

export const BUCKET = 'mi-dashboard';
export const FILES = ['core', 'news', 'performance'] as const;
export type FileName = (typeof FILES)[number];
export const SCHEMA = 'mi-web/1';
/** Vercel rejects request bodies over 4.5 MB before the handler runs; stay under it. */
export const MAX_BODY_BYTES = 4_000_000;

const json = z.record(z.string(), z.unknown());

export const uploadSchema = z.object({
  schema: z.literal(SCHEMA),
  files: z.object({
    core: json.refine(v => v.schema === SCHEMA && typeof v.generated_at === 'string' && typeof v.markets === 'object', {
      message: 'core: schema/generated_at/markets 필요',
    }),
    news: json.nullable(),
    performance: json.nullable(),
  }),
});

export type Upload = z.output<typeof uploadSchema>;

/** Bearer token check. Hashing both sides first keeps the comparison constant-time regardless of length. */
export function tokenMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !header?.startsWith('Bearer ')) return false;
  const a = createHash('sha256').update(header.slice(7)).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function objectPath(name: FileName): string {
  return `v1/${name}.json`;
}
