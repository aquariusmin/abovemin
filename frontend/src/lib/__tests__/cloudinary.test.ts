import { describe, expect, it } from 'vitest';
import { cloudinary, isRenderableImageUrl, DEFAULT_ASPECT } from '@/lib/cloudinary';
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
