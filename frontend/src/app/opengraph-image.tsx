import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { palette } from '@/lib/palette';

export const runtime = 'nodejs';
export const alt = 'phorage studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * 공유 카드.
 *
 * 워드마크는 사이트와 같은 Fraunces로 그린다. 예전에는 `fontFamily:
 * 'sans-serif'`뿐이어서, 링크를 공유했을 때 처음 보이는 화면에서만 브랜드가
 * 다른 서체로 나왔다 — 사이트 전체에서 "phorage"는 세리프다.
 *
 * satori는 woff2를 읽지 못하므로 `next/font`가 받아 두는 파일을 재사용할 수
 * 없고, TTF 인스턴스를 `assets/`에 따로 둔다 (`assets/README.md` 참고).
 *
 * 두 벌을 다 싣는다. satori에는 시스템 폰트 폴백이 없어서, 넘기지 않은
 * `font-family`는 무시되고 넘긴 것 중 하나로 그려진다 — Fraunces만 실었더니
 * 아이브로와 태그라인까지 세리프가 됐다. 사이트의 타입 시스템은 디스플레이만
 * 세리프이고 나머지는 Plex Sans이므로, 카드도 그대로 따른다.
 */
export default async function OgImage() {
  const [fraunces, plexSans] = await Promise.all([
    readFile(join(process.cwd(), 'assets/Fraunces-SemiBold.ttf')),
    readFile(join(process.cwd(), 'assets/IBMPlexSans-Medium.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: palette.background,
          fontFamily: 'Fraunces',
        }}
      >
        {/* Forest band anchoring the top edge, capped with a lime hairline */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: palette.forest }} />
        <div style={{ display: 'flex', position: 'absolute', top: 14, left: 0, right: 0, height: 4, background: palette.moss }} />

        <div
          style={{
            fontSize: 22,
            color: palette.fern,
            letterSpacing: 8,
            textTransform: 'uppercase',
            marginBottom: 28,
            // The eyebrow and the tagline keep the sans, as they do on the
            // site: only the wordmark is set in the display face.
            fontFamily: 'IBM Plex Sans',
          }}
        >
          phorage studio · Seoul
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            color: palette.ink,
            letterSpacing: -3,
          }}
        >
          phorage
        </div>
        <div
          style={{
            fontSize: 24,
            color: palette.slate,
            marginTop: 20,
            letterSpacing: 1,
            fontFamily: 'IBM Plex Sans',
          }}
        >
          Collecting the Greenery
        </div>
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 4,
            background: palette.moss,
            marginTop: 36,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            background: palette.cream,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: fraunces, style: 'normal', weight: 600 },
        { name: 'IBM Plex Sans', data: plexSans, style: 'normal', weight: 500 },
      ],
    },
  );
}
