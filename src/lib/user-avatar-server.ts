import path from 'path'
import { promises as fs } from 'fs'
import { AVATAR_PUBLIC_PREFIX, avatarPublicPath } from './user-avatar'

export { avatarPublicPath }

export function avatarDiskDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'avatars')
}

export function avatarDiskPath(userId: string, ext: string) {
  return path.join(avatarDiskDir(), `${userId}.${ext}`)
}

export async function ensureAvatarDir() {
  await fs.mkdir(avatarDiskDir(), { recursive: true })
}

export async function deleteAvatarFile(publicPath: string | null | undefined) {
  if (!publicPath?.startsWith(`${AVATAR_PUBLIC_PREFIX}/`)) return
  const filename = path.basename(publicPath)
  const diskPath = path.join(avatarDiskDir(), filename)
  try {
    await fs.unlink(diskPath)
  } catch {
    // File may already be missing.
  }
}

export async function deleteAllAvatarFilesForUser(userId: string) {
  const dir = avatarDiskDir()
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const
  await Promise.all(
    extensions.map(async (ext) => {
      try {
        await fs.unlink(path.join(dir, `${userId}.${ext}`))
      } catch {
        // ignore
      }
    })
  )
}
