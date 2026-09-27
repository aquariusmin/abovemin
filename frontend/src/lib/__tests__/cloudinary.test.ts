import { describe, expect, it } from 'vitest';
import {
  cloudinary,
  cloudinaryOgImage,
  cloudinaryPlaceholder,
  isRenderableImageUrl,
  publicIdFromUrl,
  DEFAULT_ASPECT,
  OG_HEIGHT,
  OG_WIDTH,
} from '@/lib/cloudinary';
import { isOwnCloudinaryUrl, signUploadParams, uploadFolder } from '@/lib/cloudinary-upload';

const CLOUD = 'dmljaqqzc';
const real = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/photo.jpg`;

describe('cloudinary()', () => {
  it('변환 파라미터를 /upload/ 뒤에 넣는다', () => {
    expect(cloudinary(real, { width: 800 })).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,c_limit,w_800,dpr_auto/v1/photo.jpg`,
    );
  });

  it('워터마크는 체이닝된 별도 변환으로 붙인다', () => {
    // 한 변환에 묶으면 25MP 넘는 원본에서 Cloudinary가 400을 준다.
    // 먼저 줄이고 그 다음 오버레이 — 순서가 요구사항이다.
    const out = cloudinary(real, { width: 800, watermark: true });
    expect(out).toContain('w_800,dpr_auto/l_text:');
    expect(out.indexOf('w_800')).toBeLessThan(out.indexOf('l_text'));
  });

  it('우리 것이 아닌 URL은 손대지 않는다', () => {
    for (const url of [
      'https://images.unsplash.com/photo-1',
      '/local/relative.jpg',
      'not a url at all',
    ]) {
      expect(cloudinary(url)).toBe(url);
    }
  });

  it('호스트가 아닌 곳에 res.cloudinary.com이 들어 있어도 속지 않는다', () => {
    // 이 검사가 느슨하면 서버가 내부망 주소로 요청을 보내게 만들 수 있다(SSRF).
    const ssrf = 'https://169.254.169.254/latest/meta-data/?res.cloudinary.com/upload/x.jpg';
    expect(cloudinary(ssrf)).toBe(ssrf);
    expect(isRenderableImageUrl(ssrf)).toBe(false);
  });

  it('DEFAULT_ASPECT는 3:2다', () => {
    expect(DEFAULT_ASPECT).toBeCloseTo(1.5);
  });
});

describe('cloudinaryPlaceholder()', () => {
  it('32px로 줄이고 흐린 한 장을 만든다', () => {
    expect(cloudinaryPlaceholder(real)).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/w_32,q_auto:low,e_blur:400,f_auto/v1/photo.jpg`,
    );
  });

  it('저장된 주소의 변환을 걷어 낸다 — 뒤에 남은 q_auto가 q_auto:low를 되돌리지 않게', () => {
    const stored = `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/phorage/archive/photo_17.jpg`;
    expect(cloudinaryPlaceholder(stored)).toBe(
      `https://res.cloudinary.com/${CLOUD}/image/upload/w_32,q_auto:low,e_blur:400,f_auto/phorage/archive/photo_17.jpg`,
    );
    // 밑줄 든 폴더 이름은 변환이 아니다.
    const folder = `https://res.cloudinary.com/${CLOUD}/image/upload/v2/my_folder/a.jpg`;
    expect(cloudinaryPlaceholder(folder)).toContain(',e_blur:400,f_auto/v2/my_folder/a.jpg');
  });

  it('Cloudinary가 아니면 null — 배경 없이 둔다', () => {
    expect(cloudinaryPlaceholder('https://images.unsplash.com/photo-1')).toBeNull();
  });
});

describe('cloudinaryOgImage()', () => {
  const og = cloudinaryOgImage(real)!;

  it('자르지 않는다 — c_fill도 g_auto도 없다', () => {
    // 세로 사진이 카드의 가운데 띠로 잘리면 "프레임이 사진에 맞춘다"가 깨진다.
    expect(og).not.toContain('c_fill');
    expect(og).not.toContain('c_crop');
    expect(og).not.toContain('g_auto');
  });

  it('줄이고 → 워터마크 → 페이지 바탕색으로 1200×630을 채운다', () => {
    expect(og).toContain('/upload/c_limit,w_1200,h_630/l_text:');
    expect(og.endsWith('/c_pad,w_1200,h_630,b_rgb:fcfaf4,f_jpg,q_auto/v1/photo.jpg')).toBe(true);
    expect(og.indexOf('l_text')).toBeLessThan(og.indexOf('c_pad'));
    expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 630]);
  });

  it('저장된 f_auto가 f_jpg 뒤에 남지 않는다', () => {
    const stored = `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/v1783782467/DSC03534_dhyyrk.jpg`;
    expect(cloudinaryOgImage(stored)!.endsWith(',f_jpg,q_auto/v1783782467/DSC03534_dhyyrk.jpg')).toBe(true);
  });

  it('Cloudinary가 아니면 null', () => {
    expect(cloudinaryOgImage('/local.jpg')).toBeNull();
  });
});

describe('isRenderableImageUrl()', () => {
  // next.config.ts의 remotePatterns와 같이 움직여야 하는 목록.
  it.each([
    [real, true],
    ['https://images.unsplash.com/photo-1', true],
    ['http://res.cloudinary.com/x/image/upload/a.jpg', false], // http는 불가
    ['https://evil.example/image/upload/a.jpg', false],
    ['https://res.cloudinary.com/x/image/fetch/https://evil/a.jpg', false],
    ['javascript:alert(1)', false],
    ['', false],
  ])('%s → %s', (url, expected) => {
    expect(isRenderableImageUrl(url)).toBe(expected);
  });
});

describe('isOwnCloudinaryUrl()', () => {
  it('우리 계정의 업로드 주소만 통과시킨다', () => {
    expect(isOwnCloudinaryUrl(real, CLOUD)).toBe(true);
    expect(isOwnCloudinaryUrl(real, 'someone-else')).toBe(false);
  });

  it('fetch형 딜리버리 URL을 막는다', () => {
    // `/image/fetch/`는 남의 이미지를 우리 호스트로 프록시한다. 호스트만 보면
    // 통과하므로 경로 앞부분을 고정해야 한다.
    const proxied = `https://res.cloudinary.com/${CLOUD}/image/fetch/https://evil.example/upload/x.jpg`;
    expect(isOwnCloudinaryUrl(proxied, CLOUD)).toBe(false);
  });
});

describe('signUploadParams()', () => {
  it('키를 사전순으로 이어 붙여 서명한다', () => {
    // 순서가 다르면 Cloudinary가 서명을 거부하므로, 입력 순서와 무관해야 한다.
    const a = signUploadParams({ b: 2, a: 1, timestamp: 100 }, 'secret');
    const b = signUploadParams({ timestamp: 100, a: 1, b: 2 }, 'secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{40}$/);
  });

  it('시크릿이 다르면 서명도 다르다', () => {
    expect(signUploadParams({ a: 1 }, 'x')).not.toBe(signUploadParams({ a: 1 }, 'y'));
  });
});

describe('uploadFolder()', () => {
  it('기존 자산과 같은 트리에 넣는다', () => {
    expect(uploadFolder('korea')).toBe('phorage/archive/korea');
  });
});

describe('publicIdFromUrl()', () => {
  // "이 자산이 아직 쓰이는가"를 판정하는 열쇠라, 여기서 틀리면 살아 있는
  // 사진이 고아로 분류된다 — 지우면 되돌릴 수 없는 종류의 실수다.
  it.each([
    [`https://res.cloudinary.com/${CLOUD}/image/upload/v1768121750/phorage/archive/korea/a.jpg`, 'phorage/archive/korea/a'],
    // 변환이 붙어도 같은 id여야 한다. DB에는 변환이 박힌 URL도 있다.
    [`https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/v1768121750/phorage/archive/korea/a.jpg`, 'phorage/archive/korea/a'],
    [`https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,c_limit,w_800/l_text:Arial_18_bold:phorage/v1/x/y.png`, 'x/y'],
    // 버전 없는 URL.
    [`https://res.cloudinary.com/${CLOUD}/image/upload/phorage/archive/a.jpg`, 'phorage/archive/a'],
    // 버전 없이 변환만 붙은 URL — 실제 앨범 커버의 형태다. 이 경우를 놓쳐서
    // 쓰이는 커버가 "미사용 자산"으로 잡혔다.
    [`https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/phorage/archive/photo_17.jpg`, 'phorage/archive/photo_17'],
    // 밑줄이 들어간 폴더 이름을 변환으로 오해하면 안 된다.
    [`https://res.cloudinary.com/${CLOUD}/image/upload/my_folder/a.jpg`, 'my_folder/a'],
    // 공백 등이 인코딩된 이름.
    [`https://res.cloudinary.com/${CLOUD}/image/upload/v1/a%20b/c.jpg`, 'a b/c'],
    ['https://images.unsplash.com/photo-1', null],
    ['nonsense', null],
  ])('%s', (url, expected) => {
    expect(publicIdFromUrl(url)).toBe(expected);
  });

  it('DB의 URL과 실제 자산이 같은 id로 만난다', () => {
    // 이 왕복이 성립해야 고아 판정이 맞다.
    const stored = `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/v1768121750/phorage/archive/japan/p17.jpg`;
    expect(publicIdFromUrl(cloudinary(stored, { width: 800 }))).toBe(publicIdFromUrl(stored));
  });
});
