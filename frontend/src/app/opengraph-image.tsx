import { ImageResponse } from 'next/og';
import { palette } from '@/lib/palette';

export const runtime = 'nodejs';
export const alt = 'phorage studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
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
          fontFamily: 'sans-serif',
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
    { ...size }
  );
}
