import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#fafafa',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid #333333',
            borderRadius: 28,
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px',
            width: 980,
          }}
        >
          <div style={{ color: '#a3a3a3', display: 'flex', fontSize: 26 }}>@constructive-io/ui</div>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 600, marginTop: 28 }}>Constructive UI</div>
          <div style={{ color: '#d4d4d4', display: 'flex', fontSize: 32, lineHeight: 1.4, marginTop: 28 }}>
            Base React primitives for npm and the shadcn CLI.
          </div>
        </div>
      </div>
    ),
    { height: 630, width: 1200 },
  );
}
