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
          background: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: '#4A5D4E',
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
            color: '#17171c',
            letterSpacing: -3,
          }}
        >
          phorage
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#75758a',
            marginTop: 20,
            letterSpacing: 1,
          }}
        >
          Collecting the Greenery
        </div>
        <div
          style={{
            width: 64,
            height: 3,
            background: '#4A5D4E',
            marginTop: 36,
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
