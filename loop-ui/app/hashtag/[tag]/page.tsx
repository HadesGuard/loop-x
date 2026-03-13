import type { Metadata } from 'next'
import { HashtagClient } from './hashtag-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loop.app'

async function fetchHashtagMeta(
  tag: string
): Promise<{ tag: string; videoCount: number; viewCount: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/hashtags/${encodeURIComponent(tag)}?page=1&limit=1`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (!json.success) return null
    const videos: Array<{ views?: number }> = json.data?.videos ?? []
    return {
      tag,
      videoCount: json.data?.total ?? videos.length,
      viewCount: json.data?.totalViews ?? '0',
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>
}): Promise<Metadata> {
  const { tag } = await params
  const meta = await fetchHashtagMeta(tag)

  const displayTag = decodeURIComponent(tag)
  const title = `#${displayTag} | Loop`
  const description = meta
    ? `Explore ${meta.videoCount.toLocaleString()} videos tagged #${displayTag} on Loop.`
    : `Explore videos tagged #${displayTag} on Loop.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${APP_URL}/hashtag/${tag}`,
      images: [
        {
          url: `${APP_URL}/api/og?title=%23${encodeURIComponent(displayTag)}&subtitle=${encodeURIComponent(description)}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function HashtagPage({
  params: _params,
}: {
  params: Promise<{ tag: string }>
}) {
  return <HashtagClient />
}
