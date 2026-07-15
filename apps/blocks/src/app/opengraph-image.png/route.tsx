import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The site's social card, served as an explicit `.png` ROUTE instead of the
// `opengraph-image.tsx` file convention. Deliberate: the file convention
// auto-injects `og:image` WITHOUT the deploy basePath (the site.ts footgun —
// metadataBase only carries the origin), which 404s on GitHub Pages. A real
// route lets metadata declare the URL through `withBase()` like every other
// URL, and the `.png` segment gives the static host a correct content type.
// `force-static` is REQUIRED under `output: 'export'` (same as robots.ts /
// sitemap.ts). No request data, no remote fetches: keep it that way so the
// static export stays valid.

export const dynamic = 'force-static';

const SIZE = { width: 1200, height: 630 };

// DESIGN.md dark neutral ladder (§1.1) — no gradients, no glow, one blue accent.
const CANVAS = '#171717'; // surface-1
const SURFACE_2 = '#1E1E1E';
const SURFACE_3 = '#252525';
const SURFACE_4 = '#2C2C2C';
const FG = '#F5F5F5';
const MUTED = '#A3A3A3'; // muted-foreground (dark)
const HAIRLINE = 'rgba(245,245,245,0.09)'; // card hairline
const GRID_LINE = 'rgba(245,245,245,0.05)'; // baseplate
const BAR = 'rgba(245,245,245,0.12)';
const ACCENT = '#02A2FF'; // brand blue (matches icon.svg + aurora dark token)

/**
 * The brand mark, read from the shipped icon so it stays a single source of
 * truth. If the read fails for any reason we render without it rather than
 * breaking the export build.
 */
async function loadMark(): Promise<string | null> {
  try {
    const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'));
    return `data:image/svg+xml;base64,${svg.toString('base64')}`;
  } catch {
    return null;
  }
}

function SkeletonBar({ width }: { width: string }) {
  return <div style={{ width, height: 9, borderRadius: 5, background: BAR }} />;
}

function IconTile() {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        background: SURFACE_4,
        border: `1px solid ${HAIRLINE}`,
      }}
    />
  );
}

export async function GET() {
  const mark = await loadMark();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: CANVAS,
          color: FG,
        }}
      >
        {/* Baseplate: a faint hairline grid — texture never sits under text at
            full strength, so it stays at 5% foreground. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 120,
                height: 105,
                borderRight: `1px solid ${GRID_LINE}`,
                borderBottom: `1px solid ${GRID_LINE}`,
              }}
            />
          ))}
        </div>

        {/* Content row */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: 80,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: brand mark, title, one supporting line */}
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600 }}>
            {mark ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mark} width={58} height={58} style={{ borderRadius: 13, marginBottom: 32 }} alt="" />
            ) : null}
            <div
              style={{
                display: 'flex',
                fontSize: 80,
                fontWeight: 600,
                letterSpacing: -2,
                lineHeight: 1.02,
                color: FG,
              }}
            >
              Constructive Blocks
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 26,
                maxWidth: 540,
                fontSize: 27,
                lineHeight: 1.42,
                color: MUTED,
              }}
            >
              Full-stack auth, org &amp; admin blocks — install with shadcn.
            </div>
          </div>

          {/* Right: a restrained bento cluster (surface steps + hairlines) that
              reads as the live component grid, one blue "new" accent. */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: 202,
                height: 324,
                padding: 18,
                borderRadius: 18,
                background: SURFACE_3,
                border: `1px solid ${HAIRLINE}`,
                boxShadow: '0 16px 34px -18px rgba(0,0,0,0.55)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconTile />
                <div style={{ width: 11, height: 11, borderRadius: 6, background: ACCENT }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <SkeletonBar width="92%" />
                <SkeletonBar width="72%" />
                <SkeletonBar width="54%" />
                <div style={{ marginTop: 6, height: 30, width: '58%', borderRadius: 9, background: FG }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[SURFACE_2, SURFACE_3].map((bg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: 202,
                    height: 154,
                    padding: 18,
                    borderRadius: 18,
                    background: bg,
                    border: `1px solid ${HAIRLINE}`,
                    boxShadow: '0 16px 34px -18px rgba(0,0,0,0.55)',
                  }}
                >
                  <IconTile />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <SkeletonBar width="86%" />
                    <SkeletonBar width="60%" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
