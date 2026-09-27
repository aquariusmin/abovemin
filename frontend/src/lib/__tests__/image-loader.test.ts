import { describe, expect, it } from 'vitest';
import imageLoader from '@/lib/image-loader';
import { cloudinary } from '@/lib/cloudinary';

const BASE = 'https://res.cloudinary.com/dmljaqqzc/image/upload';
const real = `${BASE}/v1/phorage/photo.jpg`;
const WATERMARK = 'l_text:Arial_18_bold:phorage,o_40,co_white,g_south_east,x_20,y_20';

describe('imageLoader — Cloudinary', () => {
  it('요청 폭으로 변환을 다시 쓰고 /_next/image를 거치지 않는다', () => {
    const out = imageLoader({ src: cloudinary(real, { width: 1600 }), width: 640 });
    expect(out).toBe(`${BASE}/f_auto,q_auto,c_limit,w_640/v1/phorage/photo.jpg`);
    expect(out).not.toContain('/_next/image');
  });

  it('dpr_auto는 버린다 — srcset의 w 서술자가 이미 기기 픽셀이다', () => {
    const out = imageLoader({ src: cloudinary(real, { width: 800 }), width: 384 });
    expect(out).not.toContain('dpr_');
  });

  it('워터마크 체인은 그대로, 줄이는 변환 뒤에 남는다', () => {
    const out = imageLoader({ src: cloudinary(real, { width: 800, watermark: true }), width: 640 });
    expect(out).toBe(`${BASE}/f_auto,q_auto,c_limit,w_640/${WATERMARK}/v1/phorage/photo.jpg`);
  });

  it('호출부가 적은 폭을 넘겨 요청하지 않는다', () => {
    const src = cloudinary(real, { width: 1500, watermark: true });
    for (const width of [1920, 2048, 3840]) {
      expect(imageLoader({ src, width })).toContain(`c_limit,w_1500/`);
    }
  });

  it('quality를 주면 q_N, 안 주면 q_auto', () => {
    const src = cloudinary(real, { width: 1600 });
    expect(imageLoader({ src, width: 1080, quality: 90 })).toContain('/f_auto,q_90,c_limit,w_1080/');
    expect(imageLoader({ src, width: 1080 })).toContain('/f_auto,q_auto,c_limit,w_1080/');
  });

  it('저장된 f_auto,q_auto(앨범 커버)도 걷어 낸다 — 뒤의 q_auto가 q_90을 되돌리지 않게', () => {
    const cover = `${BASE}/f_auto,q_auto/phorage/archive/photo_17.jpg`;
    expect(imageLoader({ src: cloudinary(cover, { width: 800 }), width: 256, quality: 90 })).toBe(
      `${BASE}/f_auto,q_90,c_limit,w_256/phorage/archive/photo_17.jpg`,
    );
  });

  it('변환 없는 원본 주소에도 폭을 붙인다', () => {
    expect(imageLoader({ src: real, width: 828 })).toBe(`${BASE}/f_auto,q_auto,c_limit,w_828/v1/phorage/photo.jpg`);
  });

  it('밑줄이 든 폴더 이름은 변환으로 오해하지 않는다', () => {
    const src = `${BASE}/my_folder/photo.jpg`;
    expect(imageLoader({ src, width: 640 })).toBe(`${BASE}/f_auto,q_auto,c_limit,w_640/my_folder/photo.jpg`);
  });

  it('쿼리스트링에만 res.cloudinary.com이 든 주소는 Cloudinary로 보지 않는다', () => {
    const src = 'https://169.254.169.254/latest/meta-data/?res.cloudinary.com/upload/';
    expect(imageLoader({ src, width: 640 })).toBe(src);
  });
});

describe('imageLoader — 그 밖의 출처', () => {
  it('Unsplash에는 w, q, auto=format을 넘기고 다른 파라미터는 둔다', () => {
    const out = new URL(
      imageLoader({ src: 'https://images.unsplash.com/photo-1?fit=crop&w=2000', width: 750, quality: 90 }),
    );
    expect(out.hostname).toBe('images.unsplash.com');
    expect(out.searchParams.get('w')).toBe('750');
    expect(out.searchParams.get('q')).toBe('90');
    expect(out.searchParams.get('auto')).toBe('format');
    expect(out.searchParams.get('fit')).toBe('crop');
  });

  it('Unsplash 품질 기본값은 75', () => {
    const out = new URL(imageLoader({ src: 'https://images.unsplash.com/photo-1', width: 640 }));
    expect(out.searchParams.get('q')).toBe('75');
  });

  it('로컬 파일과 모르는 호스트는 그대로 둔다', () => {
    for (const src of ['/fonts/x.png', 'https://example.supabase.co/storage/v1/object/public/a.jpg']) {
      expect(imageLoader({ src, width: 640 })).toBe(src);
    }
  });
});
