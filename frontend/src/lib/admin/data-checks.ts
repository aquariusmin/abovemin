import { publicIdFromUrl } from '@/lib/cloudinary';
import { MIN_YEAR } from './limits';

const PLACEHOLDERS = new Set(['', '-', '—', '–', '_', '.', '?', 'untitled', 'n/a', 'none', '없음']);

export function isPlaceholderText(value: string | null | undefined): boolean {
  if (value == null) return true;
  return PLACEHOLDERS.has(value.trim().toLowerCase());
}

// "서울"·"Seoul"처럼 글자로 알 수 없는 별칭만 둔다. 없으면 대소문자·공백 차이만 잡힌다.
const LOCATION_ALIASES: Record<string, string> = {
  seoul: '서울',
  '서울': '서울',
  '서울시': '서울',
  '서울특별시': '서울',
  busan: '부산',
  '부산': '부산',
  '부산광역시': '부산',
  jeju: '제주',
  'jeju island': '제주',
  '제주': '제주',
  '제주도': '제주',
  incheon: '인천',
  '인천': '인천',
  gyeongju: '경주',
  '경주': '경주',
  tokyo: '도쿄',
  '도쿄': '도쿄',
  '東京': '도쿄',
  osaka: '오사카',
  '오사카': '오사카',
  '大阪': '오사카',
  kyoto: '교토',
  '교토': '교토',
  '京都': '교토',
  fukuoka: '후쿠오카',
  '후쿠오카': '후쿠오카',
  sapporo: '삿포로',
  '삿포로': '삿포로',
  zurich: '취리히',
  'zürich': '취리히',
  '취리히': '취리히',
  sydney: '시드니',
  '시드니': '시드니',
  melbourne: '멜버른',
  '멜버른': '멜버른',
  '멜번': '멜버른',
  'new york': '뉴욕',
  nyc: '뉴욕',
  '뉴욕': '뉴욕',
  'los angeles': '로스앤젤레스',
  la: '로스앤젤레스',
  '로스앤젤레스': '로스앤젤레스',
  '엘에이': '로스앤젤레스',
  'san francisco': '샌프란시스코',
  sf: '샌프란시스코',
  '샌프란시스코': '샌프란시스코',
};

export function normalizeLocation(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function locationKey(value: string): string {
  const normalized = normalizeLocation(value);
  return LOCATION_ALIASES[normalized] ?? normalized;
}

export interface LocationCount {
  value: string;
  count: number;
}

export interface LocationVariantGroup {
  key: string;
  variants: LocationCount[];
}

export function countLocations(values: Array<string | null | undefined>): LocationCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value == null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'));
}

export function findLocationVariants(counts: LocationCount[]): LocationVariantGroup[] {
  const groups = new Map<string, LocationCount[]>();
  for (const entry of counts) {
    if (isPlaceholderText(entry.value)) continue;
    const key = locationKey(entry.value);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, variants]) => variants.length > 1)
    .map(([key, variants]) => ({
      key,
      variants: [...variants].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko')),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, 'ko'));
}

export interface CheckAlbum {
  slug: string;
  title: string;
  cover: string | null;
  // 마이그레이션 전에는 없다 — 그때는 공개로 친다.
  published?: boolean;
}

export interface CheckPhoto {
  id: number;
  album_slug: string;
  src: string;
  title: string | null;
  location: string | null;
  // 마이그레이션이 더하는 컬럼: 적용 전에는 키가 없고, 그 점검은 아무것도 찾지 않는다.
  year?: number | null;
  width?: number | null;
  height?: number | null;
  taken_at?: string | null;
  camera?: string | null;
  exif_checked_at?: string | null;
  gps_in_original?: boolean | null;
}

export interface CheckProduct {
  id: number;
  name: string;
  price: number;
  in_stock: boolean;
}

export interface AlbumCount {
  slug: string;
  title: string;
  count: number;
}

export type CoverProblem = 'missing' | 'not_own' | 'duplicate';

export interface CoverIssue {
  slug: string;
  title: string;
  problem: CoverProblem;
  sharedWith?: string[];
}

export interface PhotoIssue {
  id: number;
  album_slug: string;
  album_title: string;
  title: string | null;
}

export interface YearMismatch extends PhotoIssue {
  year: number;
  taken_year: number;
}

export interface LowResolution extends PhotoIssue {
  width: number;
  height: number;
}

export interface DataCheckReport {
  placeholderTitles: AlbumCount[];
  placeholderLocations: AlbumCount[];
  emptyAlbums: Array<{ slug: string; title: string }>;
  coverIssues: CoverIssue[];
  locationVariants: LocationVariantGroup[];
  unpricedProducts: Array<{ id: number; name: string }>;
  yearMismatches: YearMismatch[];
  lowResolution: LowResolution[];
  missingExif: AlbumCount[];
  locationInOriginal: PhotoIssue[];
}

// UTC 연도: taken_at은 카메라 벽시계 시각을 UTC 자리에 적은 값이다(parseTakenAt).
export function takenYear(takenAt: string | null | undefined): number | null {
  if (!takenAt) return null;
  const time = Date.parse(takenAt);
  return Number.isNaN(time) ? null : new Date(time).getUTCFullYear();
}

export function isYearMismatch(photo: Pick<CheckPhoto, 'year' | 'taken_at'>): boolean {
  const taken = takenYear(photo.taken_at);
  return taken !== null && typeof photo.year === 'number' && photo.year !== taken;
}

// 800: 초기 원본 대부분이 886px 안팎이라, 더 높이면 경고가 의미를 잃는다.
export const LOW_RES_LONG_SIDE = 800;

export function isLowResolution(photo: Pick<CheckPhoto, 'width' | 'height'>): boolean {
  const { width, height } = photo;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return false;
  return Math.max(width, height) < LOW_RES_LONG_SIDE;
}

export function isMissingExif(photo: Pick<CheckPhoto, 'exif_checked_at' | 'camera' | 'taken_at'>): boolean {
  return Boolean(photo.exif_checked_at) && !photo.camera && !photo.taken_at;
}

export function hasLocationInOriginal(photo: Pick<CheckPhoto, 'gps_in_original'>): boolean {
  return photo.gps_in_original === true;
}

// 연도 규칙(MIN_YEAR ~ 내년) 밖의 촬영일은 카메라 시계가 틀린 것이라 건너뛴다.
export function planYearSync(
  photos: ReadonlyArray<Pick<CheckPhoto, 'id' | 'year' | 'taken_at'>>,
  now: Date = new Date(),
): Array<{ year: number; ids: number[] }> {
  const maxYear = now.getUTCFullYear() + 1;
  const groups = new Map<number, number[]>();
  for (const photo of photos) {
    if (!isYearMismatch(photo)) continue;
    const year = takenYear(photo.taken_at)!;
    if (year < MIN_YEAR || year > maxYear) continue;
    groups.set(year, [...(groups.get(year) ?? []), photo.id]);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([year, ids]) => ({ year, ids }));
}

function perAlbum(
  albums: CheckAlbum[],
  photos: CheckPhoto[],
  predicate: (photo: CheckPhoto) => boolean,
): AlbumCount[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    if (predicate(photo)) counts.set(photo.album_slug, (counts.get(photo.album_slug) ?? 0) + 1);
  }
  const titles = new Map(albums.map(album => [album.slug, album.title]));
  const order = new Map(albums.map((album, i) => [album.slug, i]));
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, title: titles.get(slug) ?? slug, count }))
    .sort((a, b) => (order.get(a.slug) ?? 1e9) - (order.get(b.slug) ?? 1e9));
}

// public_id로 비교한다: 변환이 붙으면 같은 파일도 URL이 다르다.
function assetKey(url: string | null | undefined): string | null {
  if (!url) return null;
  return publicIdFromUrl(url) ?? url;
}

export function runDataChecks(input: {
  albums: CheckAlbum[];
  photos: CheckPhoto[];
  products: CheckProduct[];
}): DataCheckReport {
  const { albums, photos, products } = input;

  const photoCount = new Map<string, number>();
  const ownAssets = new Map<string, Set<string>>();
  for (const photo of photos) {
    photoCount.set(photo.album_slug, (photoCount.get(photo.album_slug) ?? 0) + 1);
    const key = assetKey(photo.src);
    if (!key) continue;
    const set = ownAssets.get(photo.album_slug) ?? new Set<string>();
    set.add(key);
    ownAssets.set(photo.album_slug, set);
  }

  // 커버 중복은 공개 앨범끼리만 센다.
  const published = albums.filter(album => album.published !== false);
  const coverUsers = new Map<string, string[]>();
  for (const album of published) {
    const key = assetKey(album.cover);
    if (!key) continue;
    coverUsers.set(key, [...(coverUsers.get(key) ?? []), album.slug]);
  }

  const coverIssues: CoverIssue[] = [];
  for (const album of published) {
    const key = assetKey(album.cover);
    if (!key) {
      coverIssues.push({ slug: album.slug, title: album.title, problem: 'missing' });
      continue;
    }
    const others = (coverUsers.get(key) ?? []).filter(slug => slug !== album.slug);
    const own = ownAssets.get(album.slug)?.has(key) ?? false;
    // 빌려 쓴 쪽만 표시한다. 둘 다 자기 사진이라 주장할 때만 양쪽을 표시한다.
    if (!own) {
      coverIssues.push(
        others.length > 0
          ? { slug: album.slug, title: album.title, problem: 'duplicate', sharedWith: others }
          : { slug: album.slug, title: album.title, problem: 'not_own' },
      );
    } else if (others.some(slug => ownAssets.get(slug)?.has(key))) {
      coverIssues.push({ slug: album.slug, title: album.title, problem: 'duplicate', sharedWith: others });
    }
  }

  const albumTitle = new Map(albums.map(album => [album.slug, album.title]));
  const albumOrder = new Map(albums.map((album, i) => [album.slug, i]));
  const photoIssues = (predicate: (photo: CheckPhoto) => boolean) =>
    photos
      .filter(predicate)
      .sort((a, b) => (albumOrder.get(a.album_slug) ?? 1e9) - (albumOrder.get(b.album_slug) ?? 1e9) || a.id - b.id);
  const issue = (photo: CheckPhoto): PhotoIssue => ({
    id: photo.id,
    album_slug: photo.album_slug,
    album_title: albumTitle.get(photo.album_slug) ?? photo.album_slug,
    title: photo.title,
  });

  return {
    placeholderTitles: perAlbum(albums, photos, photo => isPlaceholderText(photo.title)),
    placeholderLocations: perAlbum(albums, photos, photo => isPlaceholderText(photo.location)),
    emptyAlbums: albums
      .filter(album => (photoCount.get(album.slug) ?? 0) === 0)
      .map(({ slug, title }) => ({ slug, title })),
    coverIssues,
    locationVariants: findLocationVariants(countLocations(photos.map(photo => photo.location))),
    // 0원은 "가격 미정"이다(lib/price.ts). 판매 중이면 장바구니에 0원 상품이 담긴다.
    unpricedProducts: products
      .filter(product => product.in_stock && product.price <= 0)
      .map(({ id, name }) => ({ id, name })),
    yearMismatches: photoIssues(isYearMismatch).map(photo => ({
      ...issue(photo),
      year: photo.year as number,
      taken_year: takenYear(photo.taken_at) as number,
    })),
    lowResolution: photoIssues(isLowResolution).map(photo => ({
      ...issue(photo),
      width: photo.width as number,
      height: photo.height as number,
    })),
    missingExif: perAlbum(albums, photos, isMissingExif),
    locationInOriginal: photoIssues(hasLocationInOriginal).map(issue),
  };
}

export function chunkIds(ids: readonly number[], size: number): number[][] {
  if (size <= 0) throw new Error('chunk size must be positive');
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

export function issueCount(report: DataCheckReport): number {
  return (
    report.placeholderTitles.length +
    report.placeholderLocations.length +
    report.emptyAlbums.length +
    report.coverIssues.length +
    report.locationVariants.length +
    report.unpricedProducts.length +
    report.yearMismatches.length +
    report.lowResolution.length +
    report.missingExif.length +
    report.locationInOriginal.length
  );
}
