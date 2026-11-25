/**
 * Slack / Microsoft Teams webhook integration.
 * Posts rich notification cards when key hiring events occur.
 *
 * Set SLACK_WEBHOOK_URL or TEAMS_WEBHOOK_URL in .env to enable.
 */

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL
const TEAMS_WEBHOOK = process.env.TEAMS_WEBHOOK_URL

interface WebhookPayload {
  title: string
  text: string
  color?: string
  fields?: Array<{ name: string; value: string }>
  actionUrl?: string
  actionLabel?: string
}

async function postToSlack(payload: WebhookPayload): Promise<void> {
  if (!SLACK_WEBHOOK) return
  const colorMap: Record<string, string> = {
    green: '#10b981',
    blue: '#3b82f6',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
  }
  const color = colorMap[payload.color || ''] || '#3b82f6'

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: payload.title, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: payload.text },
    },
  ]

  if (payload.fields && payload.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: payload.fields.flatMap((f) => [
        { type: 'mrkdwn', text: `*${f.name}*\n${f.value}` },
      ]),
    })
  }

  if (payload.actionUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: payload.actionLabel || 'View Details', emoji: true },
          url: payload.actionUrl,
        },
      ],
    })
  }

  const body = {
    attachments: [
      {
        color,
        blocks,
      },
    ],
  }

  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

async function postToTeams(payload: WebhookPayload): Promise<void> {
  if (!TEAMS_WEBHOOK) return
  const color = payload.color || 'blue'

  const facts: any[] = []
  if (payload.fields) {
    for (const f of payload.fields) {
      facts.push({ name: f.name, value: f.value })
    }
  }

  const body = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', text: payload.title, weight: 'Bolder', size: 'Medium' },
            { type: 'TextBlock', text: payload.text, wrap: true },
            ...(facts.length > 0
              ? [{ type: 'FactSet' as const, facts }]
              : []),
          ],
          actions: payload.actionUrl
            ? [
                {
                  type: 'Action.OpenUrl',
                  title: payload.actionLabel || 'View Details',
                  url: payload.actionUrl,
                },
              ]
            : [],
        },
      },
    ],
  }

  await fetch(TEAMS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export async function notifyWebhook(payload: WebhookPayload): Promise<void> {
  if (!SLACK_WEBHOOK && !TEAMS_WEBHOOK) return
  await Promise.allSettled([postToSlack(payload), postToTeams(payload)])
}

// Convenience methods for common hiring events
export async function notifyNewApplication(params: {
  candidateName: string
  jobTitle: string
  companyName: string
  candidateId: string
}) {
  await notifyWebhook({
    title: '📄 New Application',
    text: `${params.candidateName} applied for ${params.jobTitle}`,
    color: 'blue',
    fields: [
      { name: 'Position', value: params.jobTitle },
      { name: 'Candidate', value: params.candidateName },
    ],
    actionUrl: `${process.env.APP_URL}/candidates/${params.candidateId}`,
    actionLabel: 'View Candidate',
  })
}

export async function notifyAssessmentCompleted(params: {
  candidateName: string
  jobTitle: string
  score: number
  passed: boolean
  candidateId: string
}) {
  await notifyWebhook({
    title: '✅ Assessment Completed',
    text: `${params.candidateName} scored ${params.score}% on the ${params.jobTitle} assessment`,
    color: params.passed ? 'green' : 'orange',
    fields: [
      { name: 'Score', value: `${params.score}%` },
      { name: 'Result', value: params.passed ? 'Passed ✅' : 'Below Threshold ⚠️' },
    ],
    actionUrl: `${process.env.APP_URL}/candidates/${params.candidateId}`,
    actionLabel: 'View Results',
  })
}

export async function notifyOfferSent(params: {
  candidateName: string
  jobTitle: string
  candidateId: string
}) {
  await notifyWebhook({
    title: '🎉 Offer Sent',
    text: `An offer has been sent to ${params.candidateName} for ${params.jobTitle}`,
    color: 'green',
    fields: [
      { name: 'Position', value: params.jobTitle },
      { name: 'Candidate', value: params.candidateName },
    ],
    actionUrl: `${process.env.APP_URL}/candidates/${params.candidateId}`,
    actionLabel: 'View Candidate',
  })
}

export async function notifyInterviewScheduled(params: {
  candidateName: string
  jobTitle: string
  type: string
  scheduledAt: string
  interviewId: string
}) {
  await notifyWebhook({
    title: '📅 Interview Scheduled',
    text: `${params.type} interview with ${params.candidateName} for ${params.jobTitle}`,
    color: 'purple',
    fields: [
      { name: 'Type', value: params.type },
      { name: 'When', value: new Date(params.scheduledAt).toLocaleString() },
    ],
    actionUrl: `${process.env.APP_URL}/interviews/${params.interviewId}`,
    actionLabel: 'View Interview',
  })
}
