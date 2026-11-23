import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { palette } from '@/lib/palette';

export const runtime = 'nodejs';
export const alt = '이상민 — 데이터 분석 포트폴리오';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 한글은 의도적으로 넣지 않는다 — satori에 한글 서체를 따로 실어야 한다.
export default async function PortfolioOgImage() {
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
          justifyContent: 'center',
          padding: '0 96px',
          background: palette.background,
          fontFamily: 'Fraunces',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, height: 14, background: palette.forest }} />
        <div style={{ display: 'flex', position: 'absolute', top: 14, left: 0, right: 0, height: 4, background: palette.moss }} />

        <div
          style={{
            fontSize: 20,
            color: palette.fern,
            letterSpacing: 7,
            textTransform: 'uppercase',
            marginBottom: 26,
            fontFamily: 'IBM Plex Sans',
          }}
        >
          Portfolio · Data analysis
        </div>

        <div style={{ fontSize: 78, fontWeight: 600, color: palette.ink, letterSpacing: -2, lineHeight: 1.05 }}>
          Sangmin Lee
        </div>

        <div
          style={{
            fontSize: 27,
            color: palette.slate,
            marginTop: 26,
            lineHeight: 1.45,
            maxWidth: 880,
            fontFamily: 'IBM Plex Sans',
          }}
        >
          Testing the assumptions behind the data, and turning them into
          figures a decision can rest on.
        </div>

        <div style={{ display: 'flex', width: 120, height: 4, background: palette.moss, marginTop: 40, borderRadius: 2 }} />

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 44,
            left: 96,
            fontSize: 19,
            color: palette.slate,
            letterSpacing: 2,
            fontFamily: 'IBM Plex Sans',
          }}
        >
          abovemin.com/portfolio
        </div>

        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: palette.cream }} />
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
