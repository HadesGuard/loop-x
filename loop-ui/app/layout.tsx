import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/error-boundary'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loop.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Loop',
    template: '%s | Loop',
  },
  description: 'Short-form video platform — discover, create, and share videos.',
  keywords: ['loop', 'video', 'short-form', 'social media', 'tiktok-style'],
  openGraph: {
    siteName: 'Loop',
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'Loop — Short-form Video Platform',
    description: 'Discover and share short-form videos on Loop.',
    images: [
      {
        url: '/api/og?title=Loop&subtitle=Short-form+video+platform',
        width: 1200,
        height: 630,
        alt: 'Loop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@loop',
    title: 'Loop — Short-form Video Platform',
    description: 'Discover and share short-form videos on Loop.',
    images: ['/api/og?title=Loop&subtitle=Short-form+video+platform'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-black">
      <body className={`font-sans antialiased bg-black`}>
        <ErrorBoundary>
        {children}
        </ErrorBoundary>
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          toastOptions={{
            className: 'bg-neutral-900 text-white border border-white/10',
            style: {
              background: 'rgba(23, 23, 23, 0.95)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
