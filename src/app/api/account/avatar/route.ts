import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  AVATAR_MAX_BYTES,
  extensionForMime,
  isAllowedAvatarMime,
} from '@/lib/user-avatar'
import {
  INLINE_AVATAR_MAX_BYTES,
  uploadAvatar,
  removeAvatar,
} from '@/lib/user-avatar-storage'

export const runtime = 'nodejs'

async function requireSignedInUser() {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true as const, userId: session.user.id }
}

function avatarUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('BlobStoreNotFound') || message.includes('No token found')) {
    return 'Profile photos need Vercel Blob storage. In the Vercel dashboard: Storage → Create Blob → connect to this project, then redeploy.'
  }

  if (message.includes('not configured for files this large')) {
    return `Image is too large for temporary storage. Use an image under ${Math.round(INLINE_AVATAR_MAX_BYTES / 1024)}KB, or connect Vercel Blob for larger uploads.`
  }

  if (message.includes('EROFS') || message.includes('read-only')) {
    return 'File storage is not available on this server. Connect Vercel Blob storage and redeploy.'
  }

  return 'Could not upload image. Try a smaller file (under 500KB) or connect Vercel Blob in your Vercel project settings.'
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireSignedInUser()
    if (!access.ok) return access.response

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const mime = file.type || inferMimeFromName(file.name)
    if (!isAllowedAvatarMime(mime)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, GIF, and WebP images are supported' },
        { status: 400 }
      )
    }

    const ext = extensionForMime(mime)
    if (!ext) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > AVATAR_MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { id: access.userId },
      select: { avatarUrl: true },
    })

    await removeAvatar(access.userId, existing?.avatarUrl)

    const avatarUrl = await uploadAvatar(access.userId, ext, buffer, mime)

    await prisma.user.update({
      where: { id: access.userId },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
  } catch (e) {
    console.error('[POST /api/account/avatar]', e)
    return NextResponse.json(
      { error: avatarUploadErrorMessage(e) },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const access = await requireSignedInUser()
    if (!access.ok) return access.response

    const user = await prisma.user.findUnique({
      where: { id: access.userId },
      select: { avatarUrl: true },
    })

    await removeAvatar(access.userId, user?.avatarUrl)

    await prisma.user.update({
      where: { id: access.userId },
      data: { avatarUrl: null },
    })

    return NextResponse.json({ avatarUrl: null, previousAvatarUrl: user?.avatarUrl ?? null })
  } catch (e) {
    console.error('[DELETE /api/account/avatar]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function inferMimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  return ''
}
