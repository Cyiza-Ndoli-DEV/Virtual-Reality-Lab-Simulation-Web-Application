export const AVATAR_MAX_BYTES = 10 * 1024 * 1024
export const AVATAR_PUBLIC_PREFIX = '/uploads/avatars'

const AVATAR_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

export function defaultAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

export function avatarSeed(email?: string | null, name?: string | null) {
  return email || name || 'user'
}

export function displayAvatarUrl(
  avatarUrl: string | null | undefined,
  email?: string | null,
  name?: string | null
) {
  return avatarUrl || defaultAvatarUrl(avatarSeed(email, name))
}

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return null
  }
}

export function isAllowedAvatarMime(mime: string) {
  return AVATAR_ALLOWED_TYPES.has(mime)
}

export function avatarPublicPath(userId: string, ext: string) {
  return `${AVATAR_PUBLIC_PREFIX}/${userId}.${ext}`
}
