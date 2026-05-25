import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getStudentExperiments } from '@/lib/data/student-experiments'
import { StudentDashboardClient } from './dashboard-client'

export default async function StudentDashboard() {
  const session = await auth()
  if (!session?.user?.canAccessStudent) {
    redirect('/login')
  }

  const data = await getStudentExperiments(session.user.id)
  return <StudentDashboardClient initialData={data} />
}
