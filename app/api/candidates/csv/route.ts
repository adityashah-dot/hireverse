import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage')
    const jobId = searchParams.get('jobId')

    const where: any = {
      job: { companyId: user.companyId },
      isArchived: false,
    }
    if (stage && stage !== 'all') where.stage = stage.toUpperCase()
    if (jobId) where.jobId = jobId

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        job: { select: { title: true, department: true } },
        assessments: { select: { score: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const header = ['Name', 'Email', 'Phone', 'Job Title', 'Department', 'Stage', 'Skill Match %', 'Assessment Score %', 'Applied Date', 'Source']
    const rows = candidates.map((c) => [
      c.name,
      c.email,
      c.phone || '',
      c.job.title,
      c.job.department || '',
      c.stage,
      c.skillMatch?.toString() || '',
      c.assessments[0]?.score?.toString() || '',
      c.createdAt.toISOString().split('T')[0],
      (c as any).source || '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="candidates-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('jobId') as string

    if (!file) return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
    if (!jobId) return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: user.companyId },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const text = await file.text()
    const lines = text.trim().split('\n').map((line) => {
      const cells: string[] = []
      let current = ''
      let inQuotes = false
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
          cells.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      cells.push(current)
      return cells
    })

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have a header row and at least one data row' }, { status: 400 })
    }

    const header = lines[0].map((h) => h.toLowerCase().trim())
    const nameIdx = header.indexOf('name')
    const emailIdx = header.indexOf('email')
    const phoneIdx = header.indexOf('phone')

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json({ error: 'CSV must have "Name" and "Email" columns' }, { status: 400 })
    }

    let imported = 0
    const skipped: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]
      const name = row[nameIdx]?.trim()
      const email = row[emailIdx]?.trim().toLowerCase()
      const phone = phoneIdx !== -1 ? row[phoneIdx]?.trim() : null

      if (!name || !email) {
        skipped.push(`Row ${i + 1}: Missing name or email`)
        continue
      }

      const existing = await prisma.candidate.findUnique({
        where: { email_jobId: { email, jobId } },
      })
      if (existing) {
        skipped.push(`${name}: Already applied`)
        continue
      }

      await prisma.candidate.create({
        data: {
          name,
          email,
          phone: phone || null,
          jobId,
          stage: 'APPLIED',
          source: 'csv-import',
        },
      })

      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: skipped.length > 0 ? skipped : undefined,
      message: `Imported ${imported} candidate${imported !== 1 ? 's' : ''}${skipped.length > 0 ? ` (${skipped.length} skipped)` : ''}`,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 })
  }
}
