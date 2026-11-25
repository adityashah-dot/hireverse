import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { fetchDashboardAnalytics } from '@/lib/data/dashboard'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const initialData = await fetchDashboardAnalytics(user.companyId, 30).catch(() => null)

  return <DashboardClient initialData={initialData} />
}
