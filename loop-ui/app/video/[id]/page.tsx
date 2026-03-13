import type { Metadata } from 'next'
import { VideoDetailClient } from './video-detail-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loop.app'

interface VideoMeta {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  videoUrl: string
  username: string
  duration: number | null
}

async function fetchVideoMeta(id: string): Promise<VideoMeta | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/videos/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null
    const v = json.data
    return {
      id: v.id,
      title: v.title || v.caption || 'Video',
      description: v.description || v.caption || '',
      thumbnailUrl: v.thumbnailUrl || v.thumbnail || null,
      videoUrl: v.videoUrl || v.url || '',
      username: v.user?.username || v.username || 'unknown',
      duration: v.duration || null,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const video = await fetchVideoMeta(id)

  if (!video) {
    return {
      title: 'Video | Loop',
      description: 'Watch short-form videos on Loop.',
    }
  }

  const title = `${video.username} on Loop: ${video.title}`
  const description = video.description || `Watch ${video.username}'s video on Loop.`
  const ogImage = video.thumbnailUrl
    ? [{ url: video.thumbnailUrl, width: 1080, height: 1920, alt: video.title }]
    : [{ url: `${APP_URL}/api/og?title=${encodeURIComponent(video.title)}&username=${encodeURIComponent(video.username)}` }]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      url: `${APP_URL}/video/${id}`,
      images: ogImage,
      videos: video.videoUrl
        ? [
            {
              url: video.videoUrl,
              type: 'video/mp4',
              width: 1080,
              height: 1920,
            },
          ]
        : undefined,
    },
    twitter: video.videoUrl
      ? {
          card: 'player',
          title,
          description,
          images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
          players: [
            {
              playerUrl: `${APP_URL}/video/${id}`,
              streamUrl: video.videoUrl,
              width: 360,
              height: 640,
            },
          ],
        }
      : {
          card: 'summary_large_image',
          title,
          description,
          images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
        },
  }
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const video = await fetchVideoMeta(id)

  const jsonLd = video
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl ?? undefined,
        uploadDate: new Date().toISOString(),
        contentUrl: video.videoUrl,
        duration: video.duration ? `PT${Math.floor(video.duration)}S` : undefined,
        author: {
          '@type': 'Person',
          name: video.username,
          url: `${APP_URL}/?profile=${video.username}`,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <VideoDetailClient />
    </>
  )
}
