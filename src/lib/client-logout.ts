import { signOut } from 'next-auth/react'

/** End session and hard-navigate to login (clears client router cache). */
export async function clientLogout() {
  await signOut({ redirect: false })
  window.location.replace('/login')
}
