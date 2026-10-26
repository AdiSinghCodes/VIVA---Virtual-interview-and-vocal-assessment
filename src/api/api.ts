const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api'

let token =
  localStorage.getItem('viva_token') || ''

export function setToken(
  value: string | null
) {
  token = value || ''

  if (token) {
    localStorage.setItem(
      'viva_token',
      token
    )
  } else {
    localStorage.removeItem(
      'viva_token'
    )
  }
}

// ============================================================
// GENERIC API REQUEST
// ============================================================

async function request(
  path: string,
  options: RequestInit = {}
) {
  const url =
    `${API_BASE}${path}`

  console.log(
    '========================================'
  )

  console.log(
    '🌐 API REQUEST'
  )

  console.log(
    '========================================'
  )

  console.log(
    'URL:',
    url
  )

  console.log(
    'METHOD:',
    options.method || 'GET'
  )

  console.log(
    'HAS TOKEN:',
    Boolean(token)
  )

  const headers =
    new Headers(
      options.headers
    )

  // JSON body
  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    )
  }

  // JWT
  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`
    )
  }

  try {

    console.log(
      '📡 Sending fetch request...'
    )

    const res =
      await fetch(
        url,
        {
          ...options,
          headers,
        }
      )

    console.log(
      '📥 HTTP response:',
      res.status,
      res.statusText
    )

    const data =
      await res
        .json()
        .catch(() => ({}))

    console.log(
      '📦 Response data:',
      data
    )

    if (!res.ok) {

      throw new Error(
        data.message ||
        `Request failed (${res.status})`
      )
    }

    return data

  } catch (error) {

    console.error(
      '❌ API REQUEST FAILED'
    )

    console.error(
      'URL:',
      url
    )

    console.error(
      'Error:',
      error
    )

    throw error
  }
}

// ============================================================
// API
// ============================================================

export const api = {

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  signup: (
    body: Record<string, unknown>
  ) =>
    request(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  login: (
    body: Record<string, unknown>
  ) =>
    request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  me: () =>
    request(
      '/auth/me'
    ),

  // ----------------------------------------------------------
  // PROFILE
  // ----------------------------------------------------------

  updateProfile: (
    profile: Record<string, unknown>
  ) =>
    request(
      '/profile',
      {
        method: 'PUT',
        body: JSON.stringify({
          profile
        }),
      }
    ),

  // ----------------------------------------------------------
  // RESUME
  // ----------------------------------------------------------

  uploadResume: (
    file: File
  ) => {

    const form =
      new FormData()

    form.append(
      'resume',
      file
    )

    return request(
      '/resume/upload',
      {
        method: 'POST',
        body: form,
      }
    )
  },

  resumeAnalysis: () =>
    request(
      '/resume/analysis'
    ),

  analyzeResumeForJob: (targetRole: string, jobDescription: string) =>
    request('/resume/analyze-for-job', {
      method: 'POST',
      body: JSON.stringify({ targetRole, jobDescription }),
    }),

  // ----------------------------------------------------------
  // LIVE AI INTERVIEW
  // ----------------------------------------------------------

  startInterview: (
    setup: Record<string, unknown>
  ) =>
    request(
      '/live-interviews/start',
      {
        method: 'POST',
        body: JSON.stringify(setup),
      }
    ),

  // ----------------------------------------------------------
  // ANSWER
  // ----------------------------------------------------------

  submitInterviewAnswer: (
    interviewId: string,
    body: Record<string, unknown>
  ) =>
    request(
      `/live-interviews/${interviewId}/answer`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  getInterviewPreparationStatus: (
    interviewId: string
  ) =>
    request(
      `/live-interviews/${interviewId}/preparation-status`
    ),

  getNextInterviewQuestion: (
    interviewId: string
  ) =>
    request(
      `/live-interviews/${interviewId}/next-question`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    ),

  // ----------------------------------------------------------
  // TRANSCRIPTION
  // ----------------------------------------------------------

  transcribeInterviewAudio: (
    interviewId: string,
    file: File | Blob
  ) => {

    const form =
      new FormData()

    const audioFile =
      file instanceof File
        ? file
        : new File(
            [file],
            'answer.webm',
            {
              type:
                file.type ||
                'audio/webm'
            }
          )

    form.append(
      'audio',
      audioFile
    )

    return request(
      `/live-interviews/${interviewId}/transcribe`,
      {
        method: 'POST',
        body: form,
      }
    )
  },

  // ----------------------------------------------------------
  // COMPLETE INTERVIEW (no video/recording is stored)
  // ----------------------------------------------------------

  completeInterview: (
    interviewId: string,
    body?: Record<string, unknown>
  ) =>
    request(
      `/live-interviews/${interviewId}/complete`,
      { method: 'POST', body: JSON.stringify(body || {}) }
    ),


  // ----------------------------------------------------------
  // DASHBOARD / LEARNING / AI
  // ----------------------------------------------------------

  askAI: (question: string) =>
    request('/learning/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  searchInternetCourses: (query: string) =>
    request(`/learning/internet-courses?query=${encodeURIComponent(query)}`),

  getRecommendedCourses: () => request('/learning/recommendations'),
  getCertificateCourses: () => request('/learning/certificates'),
  searchCourses: (params: { q: string; level?: string; free?: boolean; platform?: string }) => {
    const query = new URLSearchParams({ q: params.q });
    if (params.level) query.set('level', params.level);
    if (params.free) query.set('free', 'true');
    if (params.platform) query.set('platform', params.platform);
    return request(`/learning/search?${query.toString()}`);
  },
  saveCourseInterests: (interests: string[]) => request('/learning/interests', {
    method: 'POST', body: JSON.stringify({ interests }),
  }),
  getSavedCourses: () => request('/learning/saved'),
  courseAction: (id: string, action: 'save' | 'complete' | 'dislike' | 'view') =>
    request(`/learning/courses/${id}/${action}`, { method: 'POST' }),
  undoCourseAction: (id: string, action: 'save' | 'complete' | 'dislike') =>
    request(`/learning/courses/${id}/${action}`, { method: 'DELETE' }),

  searchMyFiles: (query: string) =>
    request(`/learning/files?query=${encodeURIComponent(query)}`),

  // ----------------------------------------------------------
  // REPORT HISTORY
  // ----------------------------------------------------------

  listInterviews: () =>
    request('/live-interviews'),

  // ----------------------------------------------------------
  // GET INTERVIEW
  // ----------------------------------------------------------

  getInterview: (
    interviewId: string
  ) =>
    request(
      `/live-interviews/${interviewId}`
    ),
}

// ============================================================
// EXPORT API BASE
// ============================================================

export {
  API_BASE
}
