import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const passwordHash = await bcrypt.hash('password123', 12)

  const company = await prisma.company.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      industry: 'Technology',
      size: '50-200',
      website: 'https://acmecorp.com',
      settings: {
        create: {
          defaultAssessmentDuration: 60,
          passingScore: 70,
          notifyOnNewApplication: true,
          notifyOnAssessmentComplete: true,
        },
      },
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acmecorp.com' },
    update: {},
    create: {
      email: 'admin@acmecorp.com',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
      companyId: company.id,
    },
  })

  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@acmecorp.com' },
    update: {},
    create: {
      email: 'recruiter@acmecorp.com',
      passwordHash,
      name: 'Jane Recruiter',
      role: 'RECRUITER',
      companyId: company.id,
    },
  })

  const job = await prisma.job.upsert({
    where: { slug: 'senior-fullstack-engineer' },
    update: {},
    create: {
      title: 'Senior Full-Stack Engineer',
      slug: 'senior-fullstack-engineer',
      description: `We are looking for a Senior Full-Stack Engineer to join our growing team. 
You will be responsible for designing, building, and maintaining web applications 
across the full stack. You'll work closely with product managers, designers, and 
other engineers to deliver high-quality features.`,
      department: 'Engineering',
      location: 'San Francisco, CA',
      locationType: 'HYBRID',
      employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR',
      requirements: [
        '5+ years of full-stack development experience',
        'Strong proficiency in TypeScript and React',
        'Experience with Node.js and REST APIs',
        'Familiarity with PostgreSQL and Prisma ORM',
        'Experience with cloud services (AWS/GCP/Azure)',
        'Strong problem-solving and communication skills',
      ],
      responsibilities: [
        'Design and implement scalable web applications',
        'Write clean, maintainable TypeScript/React code',
        'Collaborate with cross-functional teams',
        'Mentor junior engineers',
        'Participate in code reviews',
        'Contribute to architectural decisions',
      ],
      skills: [
        'TypeScript',
        'React',
        'Next.js',
        'Node.js',
        'PostgreSQL',
        'Prisma',
        'AWS',
        'Docker',
        'REST APIs',
        'GraphQL',
      ],
      salaryMin: 130000,
      salaryMax: 170000,
      salaryCurrency: 'USD',
      status: 'ACTIVE',
      companyId: company.id,
      createdById: admin.id,
      publishedAt: new Date(),
    },
  })

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        text: 'Which React hook is used to manage side effects in functional components?',
        options: ['useState', 'useEffect', 'useContext', 'useReducer'],
        correctAnswer: 1,
        explanation: 'useEffect is designed for side effects like data fetching, subscriptions, and DOM mutations.',
        category: 'React',
        difficulty: 'EASY',
        jobId: job.id,
        isAiGenerated: false,
      },
      {
        text: 'What does the "T extends keyof U" syntax represent in TypeScript generics?',
        options: [
          'T must be a subtype of U',
          'T must be one of the property names of U',
          'T must be a union type of U',
          'T must implement the U interface',
        ],
        correctAnswer: 1,
        explanation: '"keyof U" returns a union of all property names of U. "T extends keyof U" means T must be one of those property names.',
        category: 'TypeScript',
        difficulty: 'HARD',
        jobId: job.id,
        isAiGenerated: false,
      },
      {
        text: 'In PostgreSQL, which isolation level prevents phantom reads?',
        options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
        correctAnswer: 3,
        explanation: 'SERIALIZABLE is the strictest isolation level and prevents phantom reads, non-repeatable reads, and dirty reads.',
        category: 'PostgreSQL',
        difficulty: 'HARD',
        jobId: job.id,
        isAiGenerated: false,
      },
    ],
  })

  console.log('✅ Seed completed!')
  console.log(`Company: ${company.name} (${company.id})`)
  console.log(`Admin: ${admin.email} / password123`)
  console.log(`Recruiter: ${recruiter.email} / password123`)
  console.log(`Job: ${job.title} (apply code: ${job.applicationCode})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
