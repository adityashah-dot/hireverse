import nodemailer from 'nodemailer'

// Create transporter lazily — uses Gmail SMTP when credentials are set, otherwise logs to console
function getTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }
  // Dev fallback: log emails to console instead of sending
  return null
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  icalEvent?: {
    method: string
    content: string | Buffer
  }
}

export async function sendEmail({ to, subject, html, from, replyTo, icalEvent }: SendEmailOptions) {
  const transporter = getTransporter()
  const fromAddress = from || `HireVerse <${process.env.GMAIL_USER || process.env.EMAIL_FROM || 'noreply@hireverse.com'}>`

  if (!transporter) {
    // No email credentials — print to console for development
    console.log('\n📧 [EMAIL - dev mode, not actually sent]')
    console.log('To:', Array.isArray(to) ? to.join(', ') : to)
    console.log('Subject:', subject)
    if (icalEvent) console.log('Includes Calendar Invite (ICS)')
    console.log('---')
    return { id: 'dev-console' }
  }

  const info = await transporter.sendMail({
    from: fromAddress,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    replyTo,
    icalEvent,
  })

  return { id: info.messageId }
}

export function assessmentInviteHtml(params: {
  candidateName: string
  jobTitle: string
  companyName: string
  assessmentUrl: string
  duration: number
  expiresAt: Date
  customMessage?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Assessment Invitation</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">AI-Powered Assessment Platform</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Assessment Invitation</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${params.candidateName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        You've been invited to complete a technical assessment for the 
        <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.
      </p>
      ${params.customMessage ? `<p style="color: #374151; line-height: 1.6; background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">${params.customMessage}</p>` : ''}
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Duration</p>
            <p style="color: #111827; font-weight: 600; margin: 0;">${params.duration} minutes</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Expires</p>
            <p style="color: #111827; font-weight: 600; margin: 0;">${params.expiresAt.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          ⚠️ This link is <strong>unique to you</strong> and can only be used once. 
          Do not share it with anyone.
        </p>
      </div>
      <a href="${params.assessmentUrl}" 
         style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Start Assessment →
      </a>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${params.assessmentUrl}" style="color: #10b981; word-break: break-all;">${params.assessmentUrl}</a>
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse • AI-Powered Hiring Platform</p>
    </div>
  </div>
</body>
</html>`
}

export function assessmentCompletedHtml(params: {
  recruiterName: string
  candidateName: string
  jobTitle: string
  score: number
  passed: boolean
  resultsUrl: string
}): string {
  const scoreColor = params.score >= 80 ? '#10b981' : params.score >= 60 ? '#f59e0b' : '#ef4444'
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Assessment Completed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; margin: 0 0 16px;">Assessment Completed</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${params.recruiterName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        <strong>${params.candidateName}</strong> has completed the assessment for 
        <strong>${params.jobTitle}</strong>.
      </p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Overall Score</p>
        <p style="color: ${scoreColor}; font-size: 48px; font-weight: 700; margin: 0;">${params.score}%</p>
        <p style="color: ${params.passed ? '#10b981' : '#ef4444'}; font-weight: 600; margin: 8px 0 0;">
          ${params.passed ? '✅ PASSED' : '❌ DID NOT PASS'}
        </p>
      </div>
      <a href="${params.resultsUrl}"
         style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Full Results →
      </a>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse</p>
    </div>
  </div>
</body>
</html>`
}

export function assessmentResultCandidateHtml(params: {
  candidateName: string
  jobTitle: string
  companyName: string
  score: number
  passed: boolean
  topicScores: Record<string, number>
  applicationStatusUrl: string
}): string {
  const scoreColor = params.score >= 80 ? '#10b981' : params.score >= 60 ? '#f59e0b' : '#ef4444'
  const topicRows = Object.entries(params.topicScores)
    .map(([topic, score]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${topic}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${score}%</td>
      </tr>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Assessment Results — ${params.jobTitle}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Assessment Results</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${params.candidateName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Thank you for completing the assessment for the <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>. Here&apos;s a summary of your performance:
      </p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Overall Score</p>
        <p style="color: ${scoreColor}; font-size: 48px; font-weight: 700; margin: 0;">${params.score}%</p>
        <p style="color: ${params.passed ? '#10b981' : '#ef4444'}; font-weight: 600; margin: 8px 0 0;">
          ${params.passed ? '✅ PASSED' : '❌ DID NOT MEET THRESHOLD'}
        </p>
      </div>

      ${topicRows ? `
      <div style="margin: 24px 0;">
        <p style="color: #111827; font-weight: 600; margin: 0 0 8px;">Topic Breakdown</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Topic</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Score</th>
            </tr>
          </thead>
          <tbody>${topicRows}</tbody>
        </table>
      </div>` : ''}

      <p style="color: #374151; line-height: 1.6; margin-top: 24px;">
        The hiring team will review your results and be in touch regarding next steps.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.applicationStatusUrl}"
           style="display: inline-block; background: #10b981; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Track Your Application →
        </a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse</p>
    </div>
  </div>
</body>
</html>`
}

export function applicationReceivedHtml(params: {
  candidateName: string
  jobTitle: string
  companyName: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Application Received</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; margin: 0 0 16px;">Application Received ✅</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${params.candidateName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        We've received your application for the <strong>${params.jobTitle}</strong> position 
        at <strong>${params.companyName}</strong>. Our team will review your application and 
        be in touch soon.
      </p>
      <p style="color: #374151; line-height: 1.6;">Thank you for your interest!</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse</p>
    </div>
  </div>
</body>
</html>`
}

export function aiInterviewInviteHtml(params: {
  candidateName: string
  jobTitle: string
  companyName: string
  interviewUrl: string
  scheduledAt: Date
  duration: number
  customMessage?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>AI Voice Interview Invitation</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Next-Generation Interview Platform</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">AI Interview Invitation</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${params.candidateName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        You've been invited to complete an AI Voice Interview for the 
        <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.
      </p>
      ${params.customMessage ? `<p style="color: #374151; line-height: 1.6; background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5;">${params.customMessage}</p>` : ''}
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Duration</p>
            <p style="color: #111827; font-weight: 600; margin: 0;">${params.duration} minutes</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Scheduled Time</p>
            <p style="color: #111827; font-weight: 600; margin: 0;">${params.scheduledAt.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #1e40af; font-size: 14px; margin: 0;">
          🎙️ <strong>Note:</strong> This is an interactive voice interview with an AI. 
          You will need a working microphone and camera to complete this session.
        </p>
      </div>
      <a href="${params.interviewUrl}" 
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Join Interview →
      </a>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${params.interviewUrl}" style="color: #6366f1; word-break: break-all;">${params.interviewUrl}</a>
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse</p>
    </div>
  </div>
</body>
</html>`
}

export function offerLetterHtml(params: {
  candidateName: string
  jobTitle: string
  companyName: string
  salary?: string
  startDate?: string
  location?: string
  employmentType?: string
  customMessage?: string
  offerUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Job Offer — ${params.jobTitle}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">HireVerse</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">🎉 Job Offer</h2>
      <p style="color: #374151; line-height: 1.6;">Dear <strong>${params.candidateName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Congratulations! After careful consideration, we are delighted to extend an offer for the
        <strong>${params.jobTitle}</strong> position at <strong>${params.companyName}</strong>.
      </p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        ${params.employmentType ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Employment Type</span>
          <span style="font-weight: 600;">${params.employmentType}</span>
        </div>` : ''}
        ${params.location ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Location</span>
          <span style="font-weight: 600;">${params.location}</span>
        </div>` : ''}
        ${params.salary ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Compensation</span>
          <span style="font-weight: 600;">${params.salary}</span>
        </div>` : ''}
        ${params.startDate ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #6b7280;">Start Date</span>
          <span style="font-weight: 600;">${params.startDate}</span>
        </div>` : ''}
      </div>

      ${params.customMessage ? `<p style="color: #374151; line-height: 1.6; background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">${params.customMessage}</p>` : ''}

      <p style="color: #374151; line-height: 1.6; margin-top: 16px;">
        We believe your skills and experience will make a great addition to our team.
        Please review the offer and respond at your earliest convenience.
      </p>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${params.offerUrl}"
           style="display: inline-block; background: #059669; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 12px;">
          Accept Offer →
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; line-height: 1.6;">
        If you have questions about this offer, please reply to this email.<br/>
        <a href="${params.offerUrl}" style="color: #059669; word-break: break-all;">${params.offerUrl}</a>
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Powered by HireVerse</p>
    </div>
  </div>
</body>
</html>`
}
