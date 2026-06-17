import { redirect } from 'next/navigation'

export default function StudentChangePasswordRedirect() {
  redirect('/student/dashboard')
}
