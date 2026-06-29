import { sendEmail } from '@/lib/send-email'

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendWelcomeCredentialsEmail({
  to,
  name,
  temporaryPassword,
  username,
  roleLabel,
}: {
  to: string
  name: string
  temporaryPassword: string
  username?: string | null
  roleLabel?: string
}): Promise<boolean> {
  const loginUrl = `${appBaseUrl()}/login`
  const safeName = escapeHtml(name)
  const safePassword = escapeHtml(temporaryPassword)
  const safeRole = roleLabel ? escapeHtml(roleLabel) : 'VRSPS'
  const usernameBlock = username
    ? `<p style="margin:0 0 12px"><strong>Username:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(username)}</code></p>`
    : ''

  return sendEmail({
    to,
    subject: 'Your VRSPS account credentials',
    html: `
      <p>Hello ${safeName},</p>
      <p>Your ${safeRole} account on the Virtual Reality Science Practical System has been created.</p>
      <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> using the credentials below. You will be asked to choose a new password on first sign-in.</p>
      <div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(to)}</p>
        ${usernameBlock}
        <p style="margin:0"><strong>Temporary password:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${safePassword}</code></p>
      </div>
      <p style="color:#64748b;font-size:13px">Keep this password private. Do not share it with anyone except the account holder.</p>
    `,
  })
}
