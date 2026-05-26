import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const UNITY_TOKEN_AUD = 'vrsps-unity-vr'

export function getUnityApiKeyFromRequest(req: NextRequest): string | null {
  const fromHeader = req.headers.get('X-API-KEY') ?? req.headers.get('x-api-key')
  if (fromHeader?.trim()) return fromHeader.trim()

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('ApiKey ')) return auth.slice(7).trim()

  return null
}

export function isUnityApiKeyValid(provided: string | null | undefined): boolean {
  const expected = process.env.UNITY_API_KEY?.trim()
  const apiKey = provided?.trim()
  return Boolean(expected && apiKey && apiKey === expected)
}

export function verifyUnityApiKey(
  req: NextRequest,
  providedKey?: string | null
): boolean {
  const key = providedKey ?? getUnityApiKeyFromRequest(req)
  return isUnityApiKeyValid(key)
}

export function unityApiKeyUnauthorized() {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message:
        'Missing or invalid API key. Send header X-API-KEY or JSON field apiKey matching UNITY_API_KEY in .env (save the file and restart npm run dev after changes).',
    },
    { status: 401 }
  )
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

function getUnityTokenSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be set')
  }
  return secret
}

export function unityTokenTtlSeconds(): number {
  const raw = process.env.UNITY_VR_TOKEN_TTL_SECONDS
  if (!raw) return 60 * 60 * 8
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 8
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export type UnityAccessTokenPayload = {
  sub: string
  exp: number
  aud: typeof UNITY_TOKEN_AUD
}

export function createUnityAccessToken(studentId: string): {
  accessToken: string
  expiresAt: string
} {
  const ttl = unityTokenTtlSeconds()
  const exp = Math.floor(Date.now() / 1000) + ttl
  const payload: UnityAccessTokenPayload = {
    sub: studentId,
    exp,
    aud: UNITY_TOKEN_AUD,
  }
  const payloadPart = encodeBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', getUnityTokenSecret())
    .update(payloadPart)
    .digest('base64url')
  return {
    accessToken: `${payloadPart}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  }
}

export function verifyUnityAccessToken(
  token: string
): UnityAccessTokenPayload | null {
  const [payloadPart, signature] = token.split('.')
  if (!payloadPart || !signature) return null

  const expectedSig = createHmac('sha256', getUnityTokenSecret())
    .update(payloadPart)
    .digest('base64url')

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length) return null
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null

  const json = decodeBase64Url(payloadPart)
  if (!json) return null

  let payload: UnityAccessTokenPayload
  try {
    payload = JSON.parse(json) as UnityAccessTokenPayload
  } catch {
    return null
  }

  if (payload.aud !== UNITY_TOKEN_AUD || !payload.sub) return null
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}
