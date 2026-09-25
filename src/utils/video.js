export function toEmbedUrl(raw) {
  if (!raw) return null
  const normalized = raw.trim()
  let match = normalized.match(
    /(?:youtube\.com\/(?:watch\?.*(?:v=|#v=)|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  if (match) {
    return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` }
  }
  match = normalized.match(/(?:vimeo\.com|player\.vimeo\.com\/video)\/(\d+)/)
  if (match) {
    return { type: 'vimeo', src: `https://player.vimeo.com/video/${match[1]}?autoplay=1` }
  }
  return { type: 'media', src: normalized }
}

export function getVideoType(raw) {
  const parsed = toEmbedUrl(raw)
  return parsed ? parsed.type : 'media'
}