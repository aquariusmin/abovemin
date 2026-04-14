import { ImageResponse } from 'next/og';

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
          background: '#FAF9F6',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#4A5D4E',
            letterSpacing: -2,
          }}
        >
          phorage
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#999',
            marginTop: 16,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Collecting the Greenery
        </div>
        <div
          style={{
            width: 60,
            height: 3,
            background: '#4A5D4E',
            marginTop: 32,
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
