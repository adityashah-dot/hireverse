// Central API client for all backend calls

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Auth ───────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    name: string
    email: string
    password: string
    companyName: string
  }) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: () => apiFetch<{ data: any }>('/api/auth/me'),
}

// ─── Jobs ───────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<{ data: any[]; meta: any }>(`/api/jobs${qs}`)
  },
  get: (id: string) => apiFetch<{ data: any }>(`/api/jobs/${id}`),
  create: (data: any) =>
    apiFetch<{ data: any }>('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ data: any }>(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch(`/api/jobs/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    apiFetch(`/api/jobs/${id}/publish`, { method: 'POST' }),
  close: (id: string) =>
    apiFetch(`/api/jobs/${id}/close`, { method: 'POST' }),
}

// ─── Candidates ─────────────────────────────────────────────────────────
export const candidatesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<{ data: any[]; meta: any }>(`/api/candidates${qs}`)
  },
  get: (id: string) => apiFetch<{ data: any }>(`/api/candidates/${id}`),
  create: (data: any) =>
    apiFetch<{ data: any }>('/api/candidates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ data: any }>(`/api/candidates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStage: (id: string, stage: string) =>
    apiFetch(`/api/candidates/${id}/stage`, { method: 'PUT', body: JSON.stringify({ stage }) }),
  getNotes: (id: string) =>
    apiFetch<{ data: any[] }>(`/api/candidates/${id}/notes`),
  addNote: (id: string, content: string) =>
    apiFetch(`/api/candidates/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  getTimeline: (id: string) =>
    apiFetch<{ data: any[] }>(`/api/candidates/${id}/timeline`),
  uploadResume: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('resume', file)
    return fetch(`/api/candidates/${id}/resume`, { method: 'POST', body: fd }).then((r) => r.json())
  },
  parseResume: (id: string) =>
    apiFetch(`/api/candidates/${id}/parse`, { method: 'POST' }),
}

// ─── Assessments ─────────────────────────────────────────────────────────
export const assessmentsApi = {
  send: (data: {
    candidateId: string
    questionCount?: number
    duration?: number
    expiresInHours?: number
    customMessage?: string
    difficultyMix?: { easy: number; medium: number; hard: number }
    focusTopics?: string[]
    useCandidateContext?: boolean
  }) => apiFetch('/api/assessments/send', { method: 'POST', body: JSON.stringify(data) }),

  getByToken: (token: string) =>
    apiFetch<{ data: any }>(`/api/assessments/${token}`),
  start: (token: string) =>
    apiFetch<{ startedAt: string; endsAt: string }>(`/api/assessments/${token}/start`, {
      method: 'POST',
    }),
  submit: (
    token: string,
    answers: Array<{ questionId: string; selectedAnswer: number; timeTaken?: number }>,
    tabSwitchCount?: number
  ) =>
    apiFetch(`/api/assessments/${token}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, tabSwitchCount }),
    }),
  logEvent: (token: string, type: string, count?: number) =>
    apiFetch(`/api/assessments/${token}/event`, {
      method: 'POST',
      body: JSON.stringify({ type, count }),
    }),
  getResults: (id: string) =>
    apiFetch<{ data: any }>(`/api/assessments/results/${id}`),
}

// ─── Questions ─────────────────────────────────────────────────────────
export const questionsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<{ data: any[]; meta: any }>(`/api/questions${qs}`)
  },
  generate: (data: {
    jobId: string
    count?: number
    saveToBank?: boolean
    difficultyMix?: { easy: number; medium: number; hard: number }
    focusTopics?: string[]
  }) =>
    apiFetch('/api/questions/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiFetch(`/api/questions/${id}`, { method: 'DELETE' }),
}

// ─── Interviews ─────────────────────────────────────────────────────────
export const interviewsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<{ data: any[] }>(`/api/interviews${qs}`)
  },
  create: (data: any) =>
    apiFetch<{ data: any }>('/api/interviews', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiFetch<{ data: any }>(`/api/interviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancel: (id: string) =>
    apiFetch(`/api/interviews/${id}`, { method: 'DELETE' }),
  submitFeedback: (id: string, data: any) =>
    apiFetch(`/api/interviews/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
}

// ─── Analytics ─────────────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => apiFetch<{ data: any }>('/api/analytics/dashboard'),
  pipeline: (jobId?: string) => {
    const qs = jobId ? `?jobId=${jobId}` : ''
    return apiFetch<{ data: any }>(`/api/analytics/pipeline${qs}`)
  },
}

// ─── Public ─────────────────────────────────────────────────────────────
export const publicApi = {
  listJobs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch<{ data: any[]; meta: any }>(`/api/public/jobs${qs}`)
  },
  getJob: (slug: string) =>
    apiFetch<{ data: any }>(`/api/public/jobs/${slug}`),
  apply: (formData: FormData) =>
    fetch('/api/public/apply', { method: 'POST', body: formData }).then((r) => r.json()),
}

// ─── Team ─────────────────────────────────────────────────────────────
export const teamApi = {
  list: () => apiFetch<{ data: any[] }>('/api/team'),
  invite: (data: { name: string; email: string; role: string }) =>
    apiFetch<{ data: any; tempPassword: string }>('/api/team', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (userId: string, role: string) =>
    apiFetch(`/api/team/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  remove: (userId: string) =>
    apiFetch(`/api/team/${userId}`, { method: 'DELETE' }),
}

// ─── Activity ───────────────────────────────────────────────────────────
export const activityApi = {
  list: (limit = 50) => apiFetch<{ data: any[] }>(`/api/activity?limit=${limit}`),
}

// ─── Settings ─────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => apiFetch<{ data: any }>('/api/settings'),
  update: (data: any) =>
    apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
}
