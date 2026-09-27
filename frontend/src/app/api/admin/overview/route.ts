import { NextResponse } from 'next/server';
import { withColumnFallback } from '@/lib/db-compat';
import { runDataChecks, type CheckAlbum, type CheckPhoto, type CheckProduct } from '@/lib/admin/data-checks';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/admin/schemas';
import { adminDb, dbErrorResponse, guardRead } from '@/lib/admin/route-helpers';
import { PHOTO_COLUMN_LEVEL, photoColumnSets, selectWithColumnSets } from '@/lib/admin/photo-columns';

/**
 * 개요 탭 한 화면에 필요한 것을 한 번에: 숫자, 최근 사진, 데이터 점검.
 *
 * 점검 규칙은 전부 서버(`lib/admin/data-checks.ts`)에서 돈다. 화면이 같은 행을
 * 따로 받아 따로 판단하면, 같은 "빈 제목"을 두 곳이 다르게 셀 수 있다.
 *
 * 전체 사진을 읽는다(293행). 개요는 가끔 여는 화면이고, 앨범별로 나눠 읽는 것이
 * 오히려 왕복만 늘린다.
 */

const RECENT_LIMIT = 12;

type PhotoRow = CheckPhoto & { year: number | null; hidden?: boolean; created_at?: string };
type AlbumRow = CheckAlbum & { id: number };

export async function GET() {
  const denied = await guardRead();
  if (denied) return denied;
  const db = adminDb('admin_overview');
  if (!db.ok) return db.response;

  const [albums, photos, products, orders] = await Promise.all([
    withColumnFallback(
      'admin_overview.albums',
      () => db.value.from('albums').select('id, slug, title, cover, published').order('sort_order'),
      () => db.value.from('albums').select('id, slug, title, cover').order('sort_order'),
    ),
    // 촬영 정보·위치 플래그 컬럼까지 읽는다. 마이그레이션이 빠진 만큼 내려가며
    // 읽고, 그 점검들은 빈 목록이 된다(`CheckPhoto`의 선택 필드).
    selectWithColumnSets('admin_overview.photos', photoColumnSets('id, album_slug, src, title, location, year'), columns =>
      db.value.from('photos').select(columns),
    ),
    db.value.from('products').select('id, name, price, in_stock'),
    db.value.from('orders').select('status'),
  ]);

  for (const [label, result] of [
    ['albums', albums],
    ['photos', photos],
    ['products', products],
    ['orders', orders],
  ] as const) {
    if (result.error) return dbErrorResponse(`admin_overview_${label}`, result.error);
  }

  const albumRows = (albums.data ?? []) as unknown as AlbumRow[];
  const photoRows = (photos.data ?? []) as unknown as PhotoRow[];
  const productRows = (products.data ?? []) as CheckProduct[];

  const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map(status => [status, 0])) as Record<OrderStatus, number>;
  for (const row of orders.data ?? []) {
    const status = row.status as OrderStatus;
    if (status in ordersByStatus) ordersByStatus[status] += 1;
  }

  // 마이그레이션이 채운 `created_at`은 기존 293장이 전부 같은 값이다. 같은 값끼리는
  // id가 큰 쪽(나중에 들어온 쪽)을 먼저 둔다.
  const recent = [...photoRows]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id)
    .slice(0, RECENT_LIMIT);

  const titles = new Map(albumRows.map(album => [album.slug, album.title]));

  return NextResponse.json({
    counts: {
      albums: albumRows.length,
      unpublishedAlbums: albumRows.filter(album => album.published === false).length,
      photos: photoRows.length,
      hiddenPhotos: photoRows.filter(photo => photo.hidden === true).length,
      products: productRows.length,
      productsInStock: productRows.filter(product => product.in_stock).length,
      ordersByStatus,
    },
    recent: recent.map(photo => ({
      id: photo.id,
      src: photo.src,
      title: photo.title,
      album_slug: photo.album_slug,
      album_title: titles.get(photo.album_slug) ?? photo.album_slug,
      hidden: photo.hidden ?? false,
      created_at: photo.created_at ?? null,
    })),
    report: runDataChecks({ albums: albumRows, photos: photoRows, products: productRows }),
    migrationPending: albums.migrationPending || photos.level >= PHOTO_COLUMN_LEVEL.legacy,
    /** 촬영 정보 점검(연도·저해상도·촬영 정보 없음)에 필요한 archive-extras가 없다. */
    extrasMigrationPending: photos.level >= PHOTO_COLUMN_LEVEL.noExtras,
    /** "위치 정보가 남은 원본" 점검에 필요한 upload-privacy가 없다. */
    privacyMigrationPending: photos.level >= PHOTO_COLUMN_LEVEL.noPrivacy,
  });
}
