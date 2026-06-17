import nodemailer from 'nodemailer'

type SendEmailInput = {
  to: string
  subject: string
  html: string
}

type GmailConfig = {
  user: string
  pass: string
  from: string
}

function normalizeAppPassword(raw: string | undefined): string {
  return raw?.replace(/\s/g, '') ?? ''
}

function getGmailConfig(): GmailConfig | null {
  const user = process.env.GMAIL_USER?.trim()
  const pass = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD)
  const from = process.env.EMAIL_FROM?.trim() || user

  if (!user || !pass || !from) return null

  return { user, pass, from }
}

function validateAppPassword(pass: string): string | null {
  if (pass.length !== 16) {
    return `GMAIL_APP_PASSWORD must be a 16-character Google App Password (yours is ${pass.length} characters). Regular Gmail passwords do not work.`
  }
  if (!/^[a-z]{16}$/i.test(pass)) {
    return 'GMAIL_APP_PASSWORD should be 16 letters only (the format Google shows for App Passwords).'
  }
  return null
}

function formatFromAddress(from: string, fallbackEmail: string): string {
  if (from.includes('<') && from.includes('>')) return from
  return `VRSPS <${from.includes('@') ? from : fallbackEmail}>`
}

/** Sends email via Gmail SMTP when GMAIL_USER and GMAIL_APP_PASSWORD are set. */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const gmail = getGmailConfig()

  if (!gmail) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[email] Gmail not configured (set GMAIL_USER and GMAIL_APP_PASSWORD). To: ${to}\nSubject: ${subject}\n${html}`
      )
      return true
    }
    return false
  }

  const passwordError = validateAppPassword(gmail.pass)
  if (passwordError) {
    console.error(`[email] ${passwordError}`)
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: gmail.user,
        pass: gmail.pass,
      },
    })

    await transporter.sendMail({
      from: formatFromAddress(gmail.from, gmail.user),
      to,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error('[email] Gmail send failed:', error)
    return false
  }
}
