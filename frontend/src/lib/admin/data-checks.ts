import { publicIdFromUrl } from '@/lib/cloudinary';
import { MIN_YEAR } from './limits';

/**
 * 개요 탭의 "데이터 점검". 공개 화면에서 티가 나는 빈칸과 어긋남을 찾는다.
 *
 * 전부 순수 함수다 — 입력은 DB 행 배열, 출력은 "무엇이 어디에 몇 개". 서버가
 * 한 번 읽어 여기로 넘기고, 화면은 결과만 그린다. 규칙이 클라이언트에 있으면
 * 같은 판단이 두 곳에 생기고, 테스트할 수 있는 곳이 없어진다.
 */

// ── 자리표시자 ────────────────────────────────────────────────────────────────

/**
 * "아직 안 채웠다"는 뜻으로 들어간 값. 실제 데이터에 제목 `-` 28장, 장소 `-`/빈칸
 * 6장이 있다. 업로드 위젯은 파일명이 비면 `Untitled`를 넣는다.
 */
const PLACEHOLDERS = new Set(['', '-', '—', '–', '_', '.', '?', 'untitled', 'n/a', 'none', '없음']);

export function isPlaceholderText(value: string | null | undefined): boolean {
  if (value == null) return true;
  return PLACEHOLDERS.has(value.trim().toLowerCase());
}

// ── 장소 표기 ─────────────────────────────────────────────────────────────────

/**
 * 같은 곳의 다른 표기. 키는 `normalizeLocation`을 거친 값, 값은 묶음 이름.
 *
 * 전부 자동으로 알아낼 수 없다 — "서울"과 "Seoul"은 글자로는 아무 관계가 없다.
 * 실제로 겹친 적이 있는 것과 앨범(한국·일본·스위스·미국·호주)에서 나올 법한
 * 것만 둔다. 목록에 없으면 대소문자·공백 차이까지만 잡힌다.
 */
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

/** 비교용 정규화: 유니코드 합성형, 앞뒤 공백, 연속 공백, 대소문자. */
export function normalizeLocation(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

/** 같은 곳이면 같은 키. 별칭이 있으면 별칭, 없으면 정규화한 값. */
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
  /** 많이 쓰인 순. 첫 번째가 바꿀 방향의 기본 제안이다. */
  variants: LocationCount[];
}

/** 원본 장소 값 목록 → 표기별 개수. */
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

/** 같은 곳인데 표기가 둘 이상인 묶음. 자리표시자는 여기서 다루지 않는다. */
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

// ── 전체 점검 ─────────────────────────────────────────────────────────────────

export interface CheckAlbum {
  slug: string;
  title: string;
  cover: string | null;
  /** 마이그레이션 전에는 없다 — 그때는 공개로 친다. */
  published?: boolean;
}

export interface CheckPhoto {
  id: number;
  album_slug: string;
  src: string;
  title: string | null;
  location: string | null;
  // 아래는 마이그레이션이 더하는 컬럼이다. 적용 전에는 행에 키 자체가 없고,
  // 그 점검은 아무것도 찾지 않는다(없는 값으로 "문제 있음"을 만들지 않는다).
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
  /** `duplicate`일 때 같은 커버를 쓰는 다른 앨범들. */
  sharedWith?: string[];
}

/** 사진 한 장 단위의 점검 항목. 화면은 앨범 제목과 사진 제목으로 어느 것인지 알린다. */
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

// ── 사진 단위 규칙 ────────────────────────────────────────────────────────────
// 개요의 점검과 아카이브 탭의 필터가 같은 함수를 쓴다.

/**
 * `taken_at`의 **UTC** 연도. `taken_at`은 카메라 시계의 벽시계 시각을 UTC 자리에
 * 적은 값이라(`photo-metadata.ts`의 `parseTakenAt`), 로컬 시간대로 읽으면 12월
 * 31일 밤 사진이 이듬해가 된다.
 */
export function takenYear(takenAt: string | null | undefined): number | null {
  if (!takenAt) return null;
  const time = Date.parse(takenAt);
  return Number.isNaN(time) ? null : new Date(time).getUTCFullYear();
}

/** 적힌 연도와 촬영일의 연도가 다르다. 둘 중 하나라도 없으면 비교하지 않는다. */
export function isYearMismatch(photo: Pick<CheckPhoto, 'year' | 'taken_at'>): boolean {
  const taken = takenYear(photo.taken_at);
  return taken !== null && typeof photo.year === 'number' && photo.year !== taken;
}

/**
 * 긴 변이 이 값보다 짧으면 저해상도. 원본 대부분이 1500px 안팎으로 줄어 있어
 * 그보다 한참 작은 것만 잡는다 — 라이트박스에서 흐리게 보이기 시작하는 크기.
 */
export const LOW_RES_LONG_SIDE = 1200;

export function isLowResolution(photo: Pick<CheckPhoto, 'width' | 'height'>): boolean {
  const { width, height } = photo;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return false;
  return Math.max(width, height) < LOW_RES_LONG_SIDE;
}

/** 촬영 정보 채우기가 **이미 확인했는데** 카메라도 촬영일도 없다. 확인 전인 사진은 아니다. */
export function isMissingExif(photo: Pick<CheckPhoto, 'exif_checked_at' | 'camera' | 'taken_at'>): boolean {
  return Boolean(photo.exif_checked_at) && !photo.camera && !photo.taken_at;
}

/** 원본에 위치 정보가 남았다고 채우기가 표시한 사진. null(아직 모름)은 아니다. */
export function hasLocationInOriginal(photo: Pick<CheckPhoto, 'gps_in_original'>): boolean {
  return photo.gps_in_original === true;
}

/**
 * "촬영일 기준으로 연도 맞추기"가 실제로 쓸 값. 어긋난 사진만, 바꿀 연도별로
 * 묶는다 — 같은 연도로 가는 사진은 update 한 번이다. 연도 규칙(`MIN_YEAR` ~
 * 내년) 밖의 촬영일은 카메라 시계가 틀린 것이라 건너뛴다.
 */
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
  // 앨범 순서(입력 순서)를 따른다 — 관리 화면의 앨범 목록과 같은 순서로 읽힌다.
  const order = new Map(albums.map((album, i) => [album.slug, i]));
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, title: titles.get(slug) ?? slug, count }))
    .sort((a, b) => (order.get(a.slug) ?? 1e9) - (order.get(b.slug) ?? 1e9));
}

/** URL을 public_id로 비교한다. 같은 파일이라도 변환이 붙으면 URL이 달라서다. */
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

  // 커버 중복은 공개 앨범끼리만 센다 — 비공개 앨범은 어차피 목록에 안 나온다.
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
    // 빌려 쓴 쪽만 표시한다. `cal`이 `aus`의 커버를 쓰면 고칠 곳은 `cal`이지
    // 자기 사진을 커버로 둔 `aus`가 아니다. 둘 다 자기 사진이라고 주장하는
    // 경우(같은 파일이 두 앨범에 올라간 경우)에만 양쪽을 다 표시한다.
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

  // 사진 단위 목록은 앨범 순서, 앨범 안에서는 id 순.
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
    // 0원은 "무료"가 아니라 "가격 미정"이다(`lib/price.ts`). 그 상태로 판매 중이면
    // 장바구니에 0원 상품이 담긴다.
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

/** 긴 id 목록을 요청 상한(`MAX_BULK` 등)에 맞춰 나눈다. */
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
