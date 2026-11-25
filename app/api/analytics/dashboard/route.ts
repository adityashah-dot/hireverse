import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchDashboardAnalytics } from '@/lib/data/dashboard'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const rangeDaysParam = parseInt(searchParams.get('rangeDays') || '30')
    const rangeDays = [7, 30, 90].includes(rangeDaysParam) ? rangeDaysParam : 30

    const data = await fetchDashboardAnalytics(user.companyId, rangeDays)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
