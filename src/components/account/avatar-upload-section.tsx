'use client'

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { displayAvatarUrl } from '@/lib/user-avatar'

type AvatarUploadSectionProps = {
  avatarUrl?: string | null
  email?: string | null
  name?: string | null
  onAvatarChange: (avatarUrl: string | null) => void
  onError?: (message: string) => void
}

export function AvatarUploadSection({
  avatarUrl,
  email,
  name,
  onAvatarChange,
  onError,
}: AvatarUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [cacheKey, setCacheKey] = useState(0)

  const avatarSrc = `${displayAvatarUrl(avatarUrl, email, name)}${avatarUrl ? `?v=${cacheKey}` : ''}`

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onError?.('Please choose a PNG, JPEG, GIF, or WebP image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      onError?.('Image must be under 10MB')
      return
    }

    setBusy(true)
    onError?.('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError?.(data.error || 'Could not upload image')
        return
      }

      onAvatarChange(typeof data.avatarUrl === 'string' ? data.avatarUrl : null)
      setCacheKey(Date.now())
    } catch {
      onError?.('Could not upload image')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setBusy(true)
    onError?.('')
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError?.(data.error || 'Could not remove image')
        return
      }
      onAvatarChange(null)
      setCacheKey(Date.now())
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      onError?.('Could not remove image')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-4 ring-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleUpload(e)}
          />
          <Button
            type="button"
            className="h-9 gap-2 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-slate-200"
            disabled={busy || !avatarUrl}
            onClick={() => void handleRemove()}
          >
            Remove
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          We support PNGs, JPEGs, GIFs, and WebP files under 10MB. On production without
          cloud storage, keep images under 500KB.
        </p>
      </div>
    </section>
  )
}
