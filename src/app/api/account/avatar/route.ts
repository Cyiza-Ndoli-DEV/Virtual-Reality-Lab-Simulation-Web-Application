import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  AVATAR_MAX_BYTES,
  extensionForMime,
  isAllowedAvatarMime,
} from '@/lib/user-avatar'
import { removeAvatar, uploadAvatar } from '@/lib/user-avatar-storage'

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

export async function POST(req: NextRequest) {
  try {
    const access = await requireSignedInUser()
    if (!access.ok) return access.response

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!isAllowedAvatarMime(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, GIF, and WebP images are supported' },
        { status: 400 }
      )
    }

    const ext = extensionForMime(file.type)
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

    const avatarUrl = await uploadAvatar(access.userId, ext, buffer, file.type)

    await prisma.user.update({
      where: { id: access.userId },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
  } catch (e) {
    console.error('[POST /api/account/avatar]', e)
    const message =
      process.env.BLOB_READ_WRITE_TOKEN
        ? 'Could not upload image'
        : 'Avatar upload is not configured for this environment. Add Vercel Blob storage (BLOB_READ_WRITE_TOKEN).'
    return NextResponse.json({ error: message }, { status: 500 })
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
