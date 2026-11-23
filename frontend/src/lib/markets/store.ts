import 'server-only';
import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { isAdminRequest } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { log } from '@/lib/logger';
import { BUCKET, objectPath, type FileName } from './ingest';
import type { Core, News, Performance } from './types';

// Every page calls requireOwner() itself: client navigation does not re-run the layout.
export async function requireOwner(): Promise<void> {
  if (!(await isAdminRequest())) notFound();
}

export type Loaded<T> = { data: T | null; error: string | null; readAt: number };

// Development only: reads the bundle from a local folder. Ignored in production.
async function readLocal<T>(dir: string, name: FileName, readAt: number): Promise<Loaded<T>> {
  try {
    return { data: JSON.parse(await readFile(path.join(dir, `${name}.json`), 'utf8')) as T, error: null, readAt };
  } catch {
    return { data: null, error: `로컬 묶음 없음 (${name}.json)`, readAt };
  }
}

async function read<T>(name: FileName): Promise<Loaded<T>> {
  const readAt = Date.now();
  const localDir = process.env.NODE_ENV !== 'production' ? process.env.MI_LOCAL_BUNDLE_DIR : undefined;
  if (localDir) return readLocal<T>(localDir, name, readAt);
  let client;
  try {
    client = getSupabaseAdmin();
  } catch (error) {
    log.error('markets.store_config', error);
    return { data: null, error: '서버 저장소 설정 없음', readAt };
  }
  const { data, error } = await client.storage.from(BUCKET).download(objectPath(name));
  if (error || !data) {
    // A bucket or object that does not exist yet is the normal state before the first upload.
    log.warn('markets.store_read', { name, error: error?.message });
    return { data: null, error: '아직 업로드된 데이터 없음', readAt };
  }
  try {
    return { data: JSON.parse(await data.text()) as T, error: null, readAt };
  } catch (parseError) {
    log.error('markets.store_parse', parseError);
    return { data: null, error: '데이터 파일을 읽을 수 없음', readAt };
  }
}

export const loadCore = () => read<Core>('core');
export const loadNews = () => read<News>('news');
export const loadPerformance = () => read<Performance>('performance');
