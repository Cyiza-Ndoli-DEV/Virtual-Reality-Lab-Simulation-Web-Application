import { promises as fs } from 'fs'
import path from 'path'
import { del, put } from '@vercel/blob'
import { AVATAR_PUBLIC_PREFIX, avatarPublicPath } from '@/lib/user-avatar'

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function avatarDiskDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'avatars')
}

function avatarDiskPath(userId: string, ext: string) {
  return path.join(avatarDiskDir(), `${userId}.${ext}`)
}

async function ensureAvatarDir() {
  await fs.mkdir(avatarDiskDir(), { recursive: true })
}

async function deleteLocalAvatarFiles(userId: string) {
  const dir = avatarDiskDir()
  const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const
  await Promise.all(
    extensions.map(async (ext) => {
      try {
        await fs.unlink(path.join(dir, `${userId}.${ext}`))
      } catch {
        // ignore missing files
      }
    })
  )
}

async function deleteStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    if (!useBlobStorage()) return
    try {
      await del(avatarUrl)
    } catch {
      // Blob may already be gone.
    }
    return
  }

  if (!avatarUrl.startsWith(`${AVATAR_PUBLIC_PREFIX}/`)) return

  const filename = path.basename(avatarUrl)
  try {
    await fs.unlink(path.join(avatarDiskDir(), filename))
  } catch {
    // ignore
  }
}

export async function uploadAvatar(
  userId: string,
  ext: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (useBlobStorage()) {
    const blob = await put(`avatars/${userId}.${ext}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return blob.url
  }

  await ensureAvatarDir()
  await deleteLocalAvatarFiles(userId)
  await fs.writeFile(avatarDiskPath(userId, ext), buffer)
  return avatarPublicPath(userId, ext)
}

export async function removeAvatar(
  userId: string,
  avatarUrl: string | null | undefined
) {
  await deleteStoredAvatar(avatarUrl)
  if (!useBlobStorage()) {
    await deleteLocalAvatarFiles(userId)
  }
}
