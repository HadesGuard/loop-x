import type { Metadata } from 'next'
import { SoundDetailClient } from './sound-detail-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loop.app'

interface SoundMeta {
  id: string
  title: string
  artist: string
  thumbnail: string | null
  description: string | null
  totalVideos: number
  genre: string | null
}

async function fetchSoundMeta(id: string): Promise<SoundMeta | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sounds/${id}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success || !json.data) return null
    const s = json.data
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail ?? null,
      description: s.description ?? null,
      totalVideos: s.totalVideos ?? 0,
      genre: s.genre ?? null,
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
  const sound = await fetchSoundMeta(id)

  if (!sound) {
    return {
      title: 'Sound | Loop',
      description: 'Listen to sounds and music on Loop.',
    }
  }

  const title = `${sound.title} by ${sound.artist} | Loop`
  const description =
    sound.description ||
    `${sound.totalVideos.toLocaleString()} videos on Loop use "${sound.title}" by ${sound.artist}.${sound.genre ? ` Genre: ${sound.genre}.` : ''}`

  const ogImage = sound.thumbnail
    ? [{ url: sound.thumbnail, alt: sound.title }]
    : [
        {
          url: `${APP_URL}/api/og?title=${encodeURIComponent(sound.title)}&subtitle=${encodeURIComponent(`by ${sound.artist}`)}`,
        },
      ]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'music.song',
      url: `${APP_URL}/sound/${id}`,
      images: ogImage,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: sound.thumbnail ? [sound.thumbnail] : undefined,
    },
  }
}

export default async function SoundPage({
  params: _params,
}: {
  params: Promise<{ id: string }>
}) {
  return <SoundDetailClient />
}
