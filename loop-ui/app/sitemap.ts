import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loop.app'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchTrendingHashtags(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/hashtags/trending?limit=50`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data.map((h: { tag: string }) => h.tag)
  } catch {
    return []
  }
}

async function fetchRecentVideoIds(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/discover/trending?limit=100`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = await res.json()
    if (!json.success || !json.data?.videos) return []
    return json.data.videos.map((v: { id: string }) => v.id)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hashtags, videoIds] = await Promise.all([
    fetchTrendingHashtags(),
    fetchRecentVideoIds(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
    {
      url: `${APP_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/sound`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  const hashtagRoutes: MetadataRoute.Sitemap = hashtags.map((tag) => ({
    url: `${APP_URL}/hashtag/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }))

  const videoRoutes: MetadataRoute.Sitemap = videoIds.map((id) => ({
    url: `${APP_URL}/video/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticRoutes, ...hashtagRoutes, ...videoRoutes]
}
