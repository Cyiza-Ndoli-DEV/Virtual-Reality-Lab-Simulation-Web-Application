/**
 * Sends a test email through Gmail using .env credentials.
 * Usage: npm run test:email -- you@gmail.com
 */
import { config } from 'dotenv'
import { sendEmail } from '../src/lib/send-email'

config()

async function main() {
  const to = process.argv[2] ?? process.env.GMAIL_USER

  if (!to) {
    console.error('Usage: npm run test:email -- recipient@example.com')
    process.exit(1)
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error(
      'Set GMAIL_USER and GMAIL_APP_PASSWORD in .env (use a Google App Password).'
    )
    process.exit(1)
  }

  const pass = process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
  if (pass.length !== 16) {
    console.error(
      `GMAIL_APP_PASSWORD must be exactly 16 characters (Google App Password). Yours is ${pass.length} characters — you may have pasted your normal Gmail password instead.`
    )
    console.error('Create one at: https://myaccount.google.com/apppasswords')
    process.exit(1)
  }

  const ok = await sendEmail({
    to,
    subject: 'VRSPS Gmail test',
    html: '<p>If you received this, Gmail SMTP is configured correctly for VRSPS.</p>',
  })

  if (!ok) {
    console.error('Failed to send test email. Check Gmail credentials and App Password.')
    process.exit(1)
  }

  console.log(`Test email sent to ${to}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
