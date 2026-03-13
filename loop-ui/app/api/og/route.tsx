import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const title = searchParams.get('title') || 'Loop'
  const subtitle = searchParams.get('subtitle') || 'Short-form video platform'
  const username = searchParams.get('username') || ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #16213e 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff0050, #ff4081)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '32px',
            }}
          >
            ▶
          </div>
          <span
            style={{
              fontSize: '40px',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            Loop
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 50 ? '36px' : '48px',
            fontWeight: '700',
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: '1.2',
            maxWidth: '900px',
            marginBottom: '20px',
          }}
        >
          {title}
        </div>

        {/* Subtitle / username */}
        {(subtitle || username) && (
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
              maxWidth: '700px',
            }}
          >
            {username ? `@${username}` : subtitle}
          </div>
        )}

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '6px',
            background: 'linear-gradient(90deg, #ff0050, #ff4081, #7c3aed)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
