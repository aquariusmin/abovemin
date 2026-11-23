import { NextResponse } from 'next/server';
import { withColumnFallback } from '@/lib/db-compat';
import { runDataChecks, type CheckAlbum, type CheckPhoto, type CheckProduct } from '@/lib/admin/data-checks';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/admin/schemas';
import { adminDb, dbErrorResponse, guardRead } from '@/lib/admin/route-helpers';
import { PHOTO_COLUMN_LEVEL, photoColumnSets, selectWithColumnSets } from '@/lib/admin/photo-columns';

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
    // 마이그레이션이 빠진 만큼 컬럼을 줄여 가며 읽고, 해당 점검은 빈 목록이 된다.
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

  // 마이그레이션이 채운 created_at은 기존 행이 모두 같아 id가 큰 쪽을 먼저 둔다.
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
