import { promises as fs } from 'fs'
import path from 'path'
import { del, put } from '@vercel/blob'
import { AVATAR_PUBLIC_PREFIX, avatarPublicPath } from '@/lib/user-avatar'

/** Inline base64 avatars when blob storage is unavailable (max ~512KB). */
export const INLINE_AVATAR_MAX_BYTES = 512 * 1024

function isVercelDeployment() {
  return process.env.VERCEL === '1'
}

function hasBlobCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN
  )
}

function shouldUseLocalDisk() {
  return !isVercelDeployment() && !hasBlobCredentials()
}

function isInlineDataUrl(url: string | null | undefined) {
  return Boolean(url?.startsWith('data:image/'))
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
  if (!avatarUrl || isInlineDataUrl(avatarUrl)) return

  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    try {
      await del(avatarUrl)
    } catch {
      // Blob may already be gone.
    }
    return
  }

  if (!avatarUrl.startsWith(`${AVATAR_PUBLIC_PREFIX}/`) || isVercelDeployment()) {
    return
  }

  const filename = path.basename(avatarUrl)
  try {
    await fs.unlink(path.join(avatarDiskDir(), filename))
  } catch {
    // ignore
  }
}

function inlineDataUrl(contentType: string, buffer: Buffer) {
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

async function uploadToBlob(
  userId: string,
  ext: string,
  buffer: Buffer,
  contentType: string
) {
  return put(`avatars/${userId}.${ext}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? { token: process.env.BLOB_READ_WRITE_TOKEN }
      : {}),
  })
}

export async function uploadAvatar(
  userId: string,
  ext: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (shouldUseLocalDisk()) {
    await ensureAvatarDir()
    await deleteLocalAvatarFiles(userId)
    await fs.writeFile(avatarDiskPath(userId, ext), buffer)
    return avatarPublicPath(userId, ext)
  }

  if (isVercelDeployment() || hasBlobCredentials()) {
    try {
      const blob = await uploadToBlob(userId, ext, buffer, contentType)
      return blob.url
    } catch (e) {
      console.error('[avatar] Vercel Blob upload failed:', e)
      if (buffer.length <= INLINE_AVATAR_MAX_BYTES) {
        return inlineDataUrl(contentType, buffer)
      }
      throw e
    }
  }

  if (buffer.length <= INLINE_AVATAR_MAX_BYTES) {
    return inlineDataUrl(contentType, buffer)
  }

  throw new Error('Avatar storage is not configured for files this large')
}

export async function removeAvatar(
  userId: string,
  avatarUrl: string | null | undefined
) {
  await deleteStoredAvatar(avatarUrl)
  if (shouldUseLocalDisk()) {
    await deleteLocalAvatarFiles(userId)
  }
}

export function avatarStorageMode():
  | 'local-disk'
  | 'vercel-blob'
  | 'inline-fallback' {
  if (shouldUseLocalDisk()) return 'local-disk'
  if (hasBlobCredentials() || isVercelDeployment()) return 'vercel-blob'
  return 'inline-fallback'
}
