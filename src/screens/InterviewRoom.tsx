// screens/InterviewRoom.tsx
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Screen } from '../types'
import { api } from '../api/api'
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  ScreenShareIcon,
  LeaveCallIcon,
  BotAvatarIcon,
} from '../components/MeetingIcons'

type QType = 'verbal' | 'coding' | 'sql'

interface Question {
  id: number
  type: QType
  category: string
  text: string
  ariaIntro: string
  difficultyTier?: 'Easy' | 'Medium' | 'Hard'
  section?: QType
  problem?: any
  constraints?: any[]
  examples?: any[]
  language?: string
  questionType?: string
  crossQuestion?: boolean
  isFollowUp?: boolean
  raw?: any
}

interface Props {
  onNavigate: (screen: Screen) => void
  setup?: any
}

const normaliseType = (q: any): QType => {
  const rawType = String(q?.type || q?.section || '').toLowerCase()
  if (rawType === 'coding') return 'coding'
  if (rawType === 'sql') return 'sql'
  const raw = String(q?.section || q?.type || q?.questionType || '').toLowerCase()
  if (/sql|database/.test(raw)) return 'sql'
  if (/coding|dsa|program/.test(raw)) return 'coding'
  return 'verbal'
}

const normaliseQuestion = (raw: any, id: number): Question => {
  const type = normaliseType(raw)
  const text = String(raw?.text || raw?.question || raw?.prompt || raw?.content || 'Please introduce yourself.')

  let difficultyTier: 'Easy' | 'Medium' | 'Hard' = 'Easy'
  const rawTier = String(raw?.difficultyTier || raw?.difficulty_tier || raw?.tier || '').toLowerCase()
  if (rawTier === 'easy' || rawTier === 'beginner') {
    difficultyTier = 'Easy'
  } else if (rawTier === 'medium' || rawTier === 'intermediate') {
    difficultyTier = 'Medium'
  } else if (rawTier === 'hard' || rawTier === 'advanced') {
    difficultyTier = 'Hard'
  } else {
    if (id <= 3) difficultyTier = 'Easy'
    else if (id <= 8) difficultyTier = 'Medium'
    else difficultyTier = 'Hard'
  }

  return {
    id,
    type,
    section: type,
    category: String(raw?.category || (type === 'sql' ? 'SQL / Database' : type === 'coding' ? 'Coding / DSA' : 'Domain Interview')),
    text,
    ariaIntro: text,
    difficultyTier,
    problem: raw?.problem || null,
    constraints: Array.isArray(raw?.constraints) ? raw.constraints : [],
    examples: Array.isArray(raw?.examples) ? raw.examples : [],
    language: raw?.language || '',
    questionType: String(raw?.questionType || raw?.question_type || ''),
    crossQuestion: Boolean(raw?.crossQuestion || raw?.cross_question || raw?.isFollowUp || raw?.is_follow_up),
    isFollowUp: Boolean(raw?.isFollowUp || raw?.is_follow_up || raw?.crossQuestion || raw?.cross_question),
    raw,
  }
}

export default function InterviewRoom({ onNavigate, setup: setupProp }: Props) {
  const [setup] = useState<any>(() => {
    const defaultSetup = {
      domain: 'Software Engineering',
      subDomain: 'Software Development',
      role: 'Candidate',
      objective: 'Mock Interview',
      types: ['General'],
      interview_types: ['General'],
      interviewType: 'General',
      stage: 'entry',
      duration: 45,
      difficulty: 'beginner',
      language: 'English',
      useResume: false,
      customTopics: '',
      codingLanguage: 'python',
      requiresCoding: false,
      requires_coding: false,
      requiresSql: false,
      requires_sql: false,
    }

    const isObject = (value: any) =>
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)

    const hasMeaningfulSetup = (value: any) =>
      isObject(value) && Object.keys(value).length > 0

    const normalizeSetup = (value: any) => {
      if (!hasMeaningfulSetup(value)) {
        return null
      }

      // Some versions of InterviewSetup save the actual setup inside
      // `setup`, `interviewSetup`, or `session`.
      let raw = value

      if (
        isObject(value.setup) &&
        Object.keys(value.setup).length > 0
      ) {
        raw = value.setup
      } else if (
        isObject(value.interviewSetup) &&
        Object.keys(value.interviewSetup).length > 0
      ) {
        raw = value.interviewSetup
      } else if (
        isObject(value.session) &&
        Object.keys(value.session).length > 0
      ) {
        raw = value.session
      }

      const rawTypes =
        raw.types ??
        raw.interview_types ??
        raw.interviewTypes ??
        []

      const types = Array.isArray(rawTypes)
        ? rawTypes.map(String).filter(Boolean)
        : rawTypes
          ? [String(rawTypes)]
          : []

      const profile = isObject(raw.profile)
        ? raw.profile
        : null

      const profileInterviewType = String(
        profile?.interviewType || ''
      )

      const interviewType = String(
        raw.interviewType ||
        raw.interview_type ||
        profileInterviewType ||
        ''
      )

      const role = String(
        raw.role ||
        raw.specific_role ||
        'Candidate'
      )

      const explicitlyCoding =
        raw.requiresCoding !== undefined
          ? Boolean(raw.requiresCoding)
          : Boolean(raw.requires_coding)

      const explicitlySql =
        raw.requiresSql !== undefined
          ? Boolean(raw.requiresSql)
          : Boolean(raw.requires_sql)

      const requiresCoding = explicitlyCoding
      const requiresSql = explicitlySql

      const normalizedTypes = types.length > 0 ? types : ['General']

      const normalized = {
        ...defaultSetup,
        ...raw,

        domain:
          raw.domain ||
          defaultSetup.domain,

        subDomain:
          raw.subDomain ||
          raw.sub_domain ||
          defaultSetup.subDomain,

        role,

        objective:
          raw.objective ||
          raw.interview_objective ||
          defaultSetup.objective,

        types: normalizedTypes,

        interview_types:
          Array.isArray(raw.interview_types)
            ? raw.interview_types.map(String).filter(Boolean)
            : normalizedTypes,

        interviewType:
          interviewType || normalizedTypes[0] || 'General',

        stage:
          raw.stage ||
          defaultSetup.stage,

        companyType:
          raw.companyType ||
          raw.company_type ||
          '',

        company:
          raw.company ||
          raw.company_name ||
          '',

        duration: Number(raw.duration || raw.duration_min || 45),

        difficulty:
          raw.difficulty ||
          defaultSetup.difficulty,

        language:
          raw.language ||
          defaultSetup.language,

        useResume:
          Boolean(
            raw.useResume ??
            raw.use_resume ??
            false
          ),

        customTopics:
          Array.isArray(raw.customTopics)
            ? raw.customTopics.join(', ')
            : raw.customTopics ||
            raw.custom_topics ||
            '',

        codingLanguage:
          raw.codingLanguage ||
          raw.coding_language ||
          'python',

        requiresCoding,
        requires_coding: requiresCoding,

        requiresSql,
        requires_sql: requiresSql,

        isTechnical: Boolean(raw.isTechnical ?? raw.is_technical),
        is_technical: Boolean(raw.isTechnical ?? raw.is_technical),
        techStack: raw.techStack || raw.tech_stack || [],
        tech_stack: raw.techStack || raw.tech_stack || [],

        profile:
          raw.profile ||
          profile ||
          null,

        resume:
          raw.useResume || raw.use_resume
            ? (raw.resume || null)
            : null,
      }

      console.log(
        '🧩 Normalized interview setup:',
        JSON.stringify(normalized, null, 2)
      )

      return normalized
    }

    // 1. Prefer setup passed directly through props.
    const fromProps = normalizeSetup(setupProp)

    if (fromProps) {
      console.log(
        '✅ Using interview setup from props:',
        fromProps
      )
      return fromProps
    }

    try {
      // 2. InterviewSetup writes this key before navigating.
      const sessionSetup =
        sessionStorage.getItem('viva_interview_setup')

      const fromSessionSetup = sessionSetup
        ? normalizeSetup(JSON.parse(sessionSetup))
        : null

      if (fromSessionSetup) {
        console.log(
          '✅ Loaded interview setup from sessionStorage:',
          fromSessionSetup
        )
        return fromSessionSetup
      }

      // 3. localStorage version of the same setup.
      const localSetup =
        localStorage.getItem('viva_interview_setup')

      const fromLocalSetup = localSetup
        ? normalizeSetup(JSON.parse(localSetup))
        : null

      if (fromLocalSetup) {
        console.log(
          '✅ Loaded interview setup from localStorage:',
          fromLocalSetup
        )
        return fromLocalSetup
      }

      // 4. Backward-compatible session key.
      const savedSession =
        localStorage.getItem('viva_interview_session')

      if (savedSession) {
        const parsed = JSON.parse(savedSession)

        const fromSavedSession =
          normalizeSetup(parsed)

        if (fromSavedSession) {
          console.log(
            '✅ Recovered interview setup from saved session:',
            fromSavedSession
          )
          return fromSavedSession
        }
      }

      // 5. Also check sessionStorage for the backward-compatible key.
      const savedSessionStorage =
        sessionStorage.getItem('viva_interview_session')

      if (savedSessionStorage) {
        const parsed = JSON.parse(savedSessionStorage)

        const fromSavedSessionStorage =
          normalizeSetup(parsed)

        if (fromSavedSessionStorage) {
          console.log(
            '✅ Recovered interview setup from sessionStorage:',
            fromSavedSessionStorage
          )
          return fromSavedSessionStorage
        }
      }
    } catch (error) {
      console.error(
        '❌ Could not load interview setup:',
        error
      )
    }

    console.warn(
      '⚠️ No interview setup found. Using default Technical setup.'
    )

    console.log(
      '📦 Default interview setup:',
      defaultSetup
    )

    return defaultSetup
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [isPrepPhase, setIsPrepPhase] = useState(true)
  const [prepCountdown, setPrepCountdown] = useState(30)
  const preloadedRef = useRef<any>(null)
  const [completedQs, setCompletedQs] = useState<Set<number>>(new Set())
  const [workspaceOpen, setWorkspaceOpen] = useState<'coding' | 'sql' | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [proctorConnected, setProctorConnected] = useState(false)
  const [proctor, setProctor] = useState({
    face_detected: false, face_inside_circle: false, face_misaligned: false,
    multiple_people: false, people_count: 0, cell_phone: false,
    hand_carrying_object: false, looking_direction: 'CENTER',
    yaw: 0, pitch: 0, roll: 0, no_face_duration: 0,
    misaligned_duration: 0, side_duration: 0, warning_count: 0,
    max_warnings: 50, last_warning_reason: '', terminated: false,
  })
  const [proctorWarningPopup, setProctorWarningPopup] = useState<{ count: number; reason: string } | null>(null)
  const lastProctorWarningCountRef = useRef(0)
  useEffect(() => {
    const count = Number(proctor.warning_count || 0)
    if (count > lastProctorWarningCountRef.current) {
      setProctorWarningPopup({ count, reason: proctor.last_warning_reason || 'The proctoring system detected a potential interview rule violation.' })
    }
    lastProctorWarningCountRef.current = count
  }, [proctor.warning_count, proctor.last_warning_reason])

  const [interviewId, setInterviewId] = useState('')
  const [plan, setPlan] = useState<any>(null)
  const [evaluation, setEvaluation] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Preparing interview…')
  const [adaptivePrepActive, setAdaptivePrepActive] = useState(false)
  const [adaptivePrepCountdown, setAdaptivePrepCountdown] = useState(0)
  const [adaptivePrepMessage, setAdaptivePrepMessage] = useState('')
  const [adaptivePrepError, setAdaptivePrepError] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const captureTimerRef = useRef<number | null>(null)

  const aiStartRef = useRef(false)

  const answerRecorderRef = useRef<MediaRecorder | null>(null)
  const answerChunks = useRef<Blob[]>([])

  // Browser SpeechRecognition provides live/interim text while the answer is being spoken.
  // Groq Whisper remains the authoritative final transcript sent to the backend.
  const recognitionRef = useRef<any>(null)
  const recognitionActiveRef = useRef(false)
  const liveTranscriptRef = useRef('')
  const [liveTranscript, setLiveTranscript] = useState('')
  // editedTranscript: what the user sees/edits in the textarea. Synced from liveTranscript unless user manually edited.
  const [editedTranscript, setEditedTranscript] = useState('')
  const userEditedRef = useRef(false) // true when user manually typed in the textarea
  // Track saved and drafted answers per question id so switching questions preserves work
  const [savedAnswers, setSavedAnswers] = useState<Record<number, string>>({})
  const [questionDrafts, setQuestionDrafts] = useState<Record<number, string>>({})
  const inFlightSubmissionRef = useRef<Promise<any> | null>(null)
  // Tab switching warning system (2 warnings, 3rd terminates interview)
  const [tabWarning, setTabWarning] = useState<{
    open: boolean;
    count: number;
    title: string;
    message: string;
    isTermination: boolean;
  } | null>(null)
  const tabSwitchCountRef = useRef(0)
  const isTabAwayRef = useRef(false)
  const lastTabSwitchTimeRef = useRef(0)
  const interviewTerminatedRef = useRef(false)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([])
  const [audioWave, setAudioWave] = useState([4, 6, 5, 8, 5, 7, 4, 6, 5, 8, 4, 6])
  const [isAriaSpeaking, setIsAriaSpeaking] = useState(true)

  const currentQ: Question = questions[qIndex] || {
    id: 1,
    type: 'verbal',
    section: 'verbal',
    category: 'Technical',
    text: 'Preparing your first question…',
    ariaIntro: 'Preparing your first question…',
  }
  const isPractical = currentQ?.type === 'coding' || currentQ?.type === 'sql'
  const isCompleted = currentQ ? completedQs.has(currentQ.id) : false

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const typeIcon: Record<QType, string> = {
    verbal: '💬',
    coding: '⌨️',
    sql: '🗄️',
  }

  const typeColor: Record<QType, string> = {
    verbal: '#7c3aed',
    coding: '#06b6d4',
    sql: '#f59e0b',
  }

  // Interview timer
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // 30-second Pre-loading Onboarding Countdown
  useEffect(() => {
    if (!isPrepPhase) return
    const prepTimer = window.setInterval(() => {
      setPrepCountdown(prev => {
        if (prev <= 1) {
          window.clearInterval(prepTimer)
          setIsPrepPhase(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(prepTimer)
  }, [isPrepPhase])

  // Trigger Q1 when 30s prep phase finishes and preloaded data is ready
  useEffect(() => {
    if (!isPrepPhase && questions.length === 0) {
      const activateQ1 = (started: any) => {
        if (!started) return
        setInterviewId(String(started.interviewId))
        setPlan(started.plan || null)

        const bank = Array.isArray(started.questionBank) && started.questionBank.length > 0
          ? started.questionBank.map((q: any, idx: number) => normaliseQuestion(q, idx + 1))
          : [normaliseQuestion(started.question, 1)]

        setQuestions(bank)
        setQIndex(0)
        setTranscript([
          {
            speaker: 'ARIA',
            text: bank[0].ariaIntro,
          },
        ])
        setStatus('ARIA is starting the interview...')
        console.log('🎉 30s prep finished! Activating and speaking Q1:', bank[0].text)
        window.setTimeout(() => {
          speakQuestion(bank[0].text, bank[0].type)
        }, 400)
      }

      if (preloadedRef.current) {
        activateQ1(preloadedRef.current)
      } else {
        console.log('⏳ Preloaded ref not ready at 30s mark yet. Awaiting startAIInterview completion...')
        const checkInterval = window.setInterval(() => {
          if (preloadedRef.current) {
            window.clearInterval(checkInterval)
            activateQ1(preloadedRef.current)
          }
        }, 300)
      }
    }
  }, [isPrepPhase, questions.length])

  // AUTOMATICALLY OPEN CODING / SQL WORKSPACE PORTAL WHEN CODING OR SQL QUESTION IS ACTIVE
  useEffect(() => {
    if (currentQ?.type === 'coding' || currentQ?.type === 'sql') {
      console.log(`🚀 Auto-opening ${currentQ.type.toUpperCase()} workspace portal for question #${currentQ.id}`)
      setWorkspaceOpen(currentQ.type)
    }
  }, [currentQ?.id, currentQ?.type])

  async function startAIInterview() {
    if (aiStartRef.current) {
      console.log('ℹ️ AI interview already started/starting — skipping duplicate.')
      return
    }

    aiStartRef.current = true

    console.log('🔥 startAIInterview() CALLED')
    console.log('📦 Interview setup:', setup)
    console.log('🌐 Calling POST /api/live-interviews/start')

    try {
      setStatus('Starting AI interviewer…')

      console.log('========================================')
      console.log('🚀 STARTING AI INTERVIEW')
      console.log('========================================')
      console.log(
        '📦 Final setup sent to backend:',
        JSON.stringify(setup, null, 2)
      )
      console.log('Types:', setup?.types)
      console.log('Interview types:', setup?.interview_types)
      console.log('Coding:', setup?.requiresCoding)
      console.log('SQL:', setup?.requiresSql)
      console.log('Language:', setup?.codingLanguage)
      console.log('========================================')

      const started = await api.startInterview(setup)

      console.log('✅ AI interview start response:', started)

      if (!started?.interviewId) {
        throw new Error('Backend did not return an interview ID.')
      }

      if (!started?.question) {
        throw new Error('AI interviewer did not return the first question.')
      }

      // Pre-load question bank data into ref - DO NOT RENDER OR SPEAK ANY QUESTION DURING INITIAL 30-SECOND PREPARATION PHASE!
      preloadedRef.current = started
      setInterviewId(String(started.interviewId))
      setPlan(started.plan || null)
      setStatus('Pre-loading AI interviewer & 15-question bank in backend (0-30s)...')
      console.log('✅ Question bank pre-loaded in backend successfully! Waiting for 30s prep countdown to reach 0 before asking Q1.')

    } catch (error: any) {
      console.error('❌ AI INTERVIEW START FAILED:', error)

      setStatus(error?.message || 'Could not start AI interview')
      setCameraError(error?.message || 'Could not start AI interviewer.')

      aiStartRef.current = false
      throw error
    }
  }
  // Start the interview and camera/proctoring independently. No interview video is stored.
  useEffect(() => {
    let cancelled = false
    let localSocket: Socket | null = null

    const startCameraAndProctor = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera/microphone access is not supported by this browser.')
        }

        setCameraError('')
        setStatus('Starting camera and microphone…')

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true,
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true

          try {
            await videoRef.current.play()
            console.log('Video playback started successfully')
          } catch (playError) {
            console.warn('Video playback error:', playError)
            if (playError instanceof Error && playError.name === 'NotAllowedError') {
              setCameraError('Please click on the page to allow video playback.')
            }
          }
        }

        // Connect the browser to the Python proctor
        try {
          const socket = io('http://localhost:5000', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            timeout: 5000,
          })

          localSocket = socket
          socketRef.current = socket

          socket.on('connect', () => {
            console.log('Proctor connected:', socket.id)
            setProctorConnected(true)
          })

          socket.on('disconnect', reason => {
            console.warn('Proctor disconnected:', reason)
            setProctorConnected(false)
          })

          socket.on('connect_error', error => {
            console.error('Proctor connection error:', error.message)
            setProctorConnected(false)
          })

          socket.on('proctor_result', data => {
            setProctor(prev => ({ ...prev, ...data }))
            if (data.terminated) setShowEndModal(true)
          })

          socket.on('proctor_error', data => {
            console.error('Proctoring:', data?.error || data)
          })

          // Send webcam frames continuously
          const canvas = document.createElement('canvas')
          canvas.width = 640
          canvas.height = 360
          captureCanvasRef.current = canvas

          captureTimerRef.current = window.setInterval(() => {
            const video = videoRef.current
            const c = captureCanvasRef.current

            if (
              !video ||
              !c ||
              video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
              socket.disconnected ||
              isCamOff
            ) {
              return
            }

            const ctx = c.getContext('2d')
            if (!ctx) return

            try {
              ctx.drawImage(video, 0, 0, c.width, c.height)
              socket.emit('video_frame', {
                image: c.toDataURL('image/jpeg', 0.65)
              })
            } catch (frameError) {
              console.warn('Frame capture warning:', frameError)
            }
          }, 250)
        } catch (proctorError) {
          console.error('Could not initialize proctor:', proctorError)
          setProctorConnected(false)
        }

        return true
      } catch (e: any) {
        console.error('Camera/microphone error:', e)

        const message =
          e?.name === 'NotAllowedError'
            ? 'Camera/microphone permission was denied. Allow camera and microphone access in the browser address-bar settings, then reload the interview.'
            : e?.name === 'NotFoundError'
              ? 'No camera or microphone was found. Connect a camera/microphone and reload the interview.'
              : e?.message || 'Could not access the camera/microphone.'

        setCameraError(message)
        setStatus('AI interview can continue, but camera/microphone is unavailable.')
        return false
      }
    }

    // ⭐ FIXED: Removed the setup guard that was preventing camera from starting
    const start = async () => {
      // Start both independently so a camera/proctor issue can never block the AI interviewer.
      console.log('🚀 Starting camera/proctor and AI interviewer...')
      void startCameraAndProctor().catch(error => {
        console.error('Camera/proctor startup failed:', error)
      })
      void startAIInterview().catch(error => {
        console.error('AI startup promise failed:', error)
      })
    }

    start()

    return () => {
      cancelled = true

      if (captureTimerRef.current !== null) {
        window.clearInterval(captureTimerRef.current)
      }
      captureTimerRef.current = null

      localSocket?.disconnect()

      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      socketRef.current = null

      if (
        answerRecorderRef.current &&
        answerRecorderRef.current.state !== 'inactive'
      ) {
        try {
          answerRecorderRef.current.stop()
        } catch { }
      }

      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // Handle camera toggling
  useEffect(() => {
    const videoTrack = streamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !isCamOff
    }
    if (videoRef.current) {
      videoRef.current.style.display = isCamOff ? 'none' : 'block'
    }
  }, [isCamOff])

  // Keep the ARIA animation tied to the actual speech engine, not a fake timer.
  useEffect(() => {
    const waveInterval = globalThis.setInterval(() => {
      if (isAriaSpeaking || isListening) {
        setAudioWave(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 7 + 3)))
      } else {
        setAudioWave([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
      }
    }, 180)

    return () => window.clearInterval(waveInterval)
  }, [isAriaSpeaking, isListening])

  // Browser TTS: ARIA speaks every verbal question aloud.
  function speakQuestion(text: string, type: QType = 'verbal') {
    if (!text) return

    // Stop any previous ARIA speech and candidate recognition before a new question.
    window.speechSynthesis?.cancel()
    stopLiveRecognition()

    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported by this browser.')
      setIsAriaSpeaking(false)
      if (type === 'verbal') {
        (window as any).setTimeout(() => void startAnswerRecording(), 250)
      }
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.96
    utterance.pitch = 1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find(v => /en-IN/i.test(v.lang)) ||
      voices.find(v => /en-US/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang))

    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => {
      console.log('🔊 ARIA started speaking')
      setIsAriaSpeaking(true)
      setStatus('ARIA is speaking…')
    }

    utterance.onend = () => {
      console.log('🔊 ARIA finished speaking')
      setIsAriaSpeaking(false)

      if (type === 'verbal') {
        window.setTimeout(() => void startAnswerRecording(), 250)
      }
    }

    utterance.onerror = (event) => {
      console.error('🔊 ARIA speech error:', event)
      setIsAriaSpeaking(false)

      // Never leave the candidate stuck because browser TTS failed.
      if (type === 'verbal') {
        window.setTimeout(() => void startAnswerRecording(), 250)
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  // Live browser transcript. Interim text is shown immediately; final text is later
  // replaced/confirmed by the Groq Whisper transcript from the backend.
  function startLiveRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('Live SpeechRecognition is unavailable; Whisper will still handle final STT.')
      return
    }

    stopLiveRecognition()

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'
    recognition.maxAlternatives = 1

    liveTranscriptRef.current = ''
    setLiveTranscript('')
    setEditedTranscript('')
    userEditedRef.current = false
    if (currentQ?.id) {
      setQuestionDrafts(prev => ({ ...prev, [currentQ.id]: '' }))
    }

    recognition.onstart = () => {
      recognitionActiveRef.current = true
      console.log('🎧 Live speech recognition started')
    }

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = String(event.results[i][0]?.transcript || '').trim()
        if (!part) continue

        if (event.results[i].isFinal) {
          finalText += `${part} `
        } else {
          interimText += `${part} `
        }
      }

      if (finalText) {
        liveTranscriptRef.current =
          `${liveTranscriptRef.current} ${finalText}`.trim()
      }

      const combined =
        `${liveTranscriptRef.current} ${interimText}`.trim()

      setLiveTranscript(combined)
      // Sync to editable textarea and drafts only when user has NOT manually typed.
      if (!userEditedRef.current) {
        setEditedTranscript(combined)
        if (currentQ?.id) {
          setQuestionDrafts(prev => ({ ...prev, [currentQ.id]: combined }))
        }
      }
    }

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are normal when the user stops speaking.
      if (event?.error !== 'no-speech' && event?.error !== 'aborted') {
        console.warn('Live speech recognition error:', event?.error)
      }
    }

    recognition.onend = () => {
      recognitionActiveRef.current = false

      // Chrome can end continuous recognition unexpectedly. Restart only while
      // the candidate is still recording/listening.
      if (answerRecorderRef.current?.state === 'recording' && !busy) {
        try {
          recognition.start()
        } catch { }
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (error) {
      console.warn('Could not start live speech recognition:', error)
    }
  }

  function stopLiveRecognition() {
    recognitionActiveRef.current = false

    try {
      recognitionRef.current?.stop()
    } catch { }

    recognitionRef.current = null
  }

  useEffect(() => {
    return () => {
      stopLiveRecognition()
      try {
        window.speechSynthesis?.cancel()
      } catch { }
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Tab switching detection: 2 warnings, terminates on 3rd violation
  useEffect(() => {
    const handleTabAway = () => {
      if (interviewTerminatedRef.current) return
      console.log('🚪 Tab switch away detected')
      isTabAwayRef.current = true
    }

    const handleTabReturn = () => {
      if (interviewTerminatedRef.current) return
      if (!isTabAwayRef.current) return
      isTabAwayRef.current = false

      const now = Date.now()
      if (now - lastTabSwitchTimeRef.current < 800) return
      lastTabSwitchTimeRef.current = now

      tabSwitchCountRef.current += 1
      const count = tabSwitchCountRef.current
      console.warn('🚨 Tab switch violation #' + count)

      if (count === 1) {
        setTabWarning({
          open: true,
          count: 1,
          title: '⚠️ Tab Switching Warning (1 of 2)',
          message: 'You have navigated away from the interview tab. Tab switching is strictly prohibited during the interview. Please stay on this window. If you switch tabs 2 more times, the interview will terminate automatically.',
          isTermination: false,
        })
      } else if (count === 2) {
        setTabWarning({
          open: true,
          count: 2,
          title: '🚨 Final Warning: Tab Switching Detected (2 of 2)',
          message: 'You have switched tabs again! This is your FINAL warning. If you navigate away from this tab one more time, your interview will terminate immediately and permanently!',
          isTermination: false,
        })
      } else if (count >= 3) {
        interviewTerminatedRef.current = true
        setTabWarning({
          open: true,
          count: 3,
          title: '⛔ Interview Terminated (3 of 3)',
          message: 'Multiple tab switching violations detected (3 of 3). Your interview has been terminated due to security policy violations. Generating your evaluation report now…',
          isTermination: true,
        })
        window.setTimeout(() => {
          void finishInterview('tab_switching_violation')
        }, 3000)
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleTabAway()
      } else {
        handleTabReturn()
      }
    }

    const onWindowBlur = () => {
      handleTabAway()
    }

    const onWindowFocus = () => {
      handleTabReturn()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [])

  async function startAnswerRecording() {
    if (!streamRef.current || busy || answerRecorderRef.current?.state === 'recording') return

    const tracks = streamRef.current.getAudioTracks()
    if (!tracks.length) {
      setStatus('Microphone is unavailable.')
      return
    }

    answerChunks.current = []
    liveTranscriptRef.current = ''
    setLiveTranscript('')

    const audioStream = new MediaStream(tracks)
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    try {
      const rec = new MediaRecorder(audioStream, { mimeType: mime })
      answerRecorderRef.current = rec

      rec.ondataavailable = e => {
        if (e.data.size) answerChunks.current.push(e.data)
      }

      rec.onerror = e => {
        console.error('🎙️ Answer recording error:', e)
        setStatus('Microphone recording error.')
      }

      rec.onstart = () => {
        setIsListening(true)
        setStatus('Listening… speak naturally')
        startLiveRecognition()
      }

      rec.onstop = () => {
        setIsListening(false)
        stopLiveRecognition()
      }

      rec.start(250)

      console.log('🎙️ Answer recording started')
    } catch (error) {
      console.error('Could not start answer recording:', error)
      setStatus('Could not start microphone recording.')
    }
  }

  function stopAnswerRecordingOnly() {
    const rec = answerRecorderRef.current

    if (!rec || rec.state === 'inactive') {
      setIsListening(false)
      stopLiveRecognition()
      return
    }

    console.log('🛑 Stopping answer recording…')
    stopLiveRecognition()
    rec.stop()
    setIsListening(false)
    setStatus('Recording stopped. Review the live transcript or submit your answer.')
  }

  async function stopAndTranscribeAnswer() {
    const rec = answerRecorderRef.current
    if (!rec || !interviewId || !currentQ) return ''

    setIsTranscribing(true)
    setStatus('Finalizing speech-to-text…')

    await new Promise<void>(resolve => {
      const oldOnStop = rec.onstop
      rec.onstop = event => {
        try {
          oldOnStop?.call(rec, event)
        } catch { }
        resolve()
      }

      stopLiveRecognition()

      if (rec.state !== 'inactive') {
        rec.stop()
      } else {
        resolve()
      }
    })

    const audio = new Blob(answerChunks.current, {
      type: rec.mimeType || 'audio/webm'
    })

    console.log('🎙️ Audio recorded:', audio.size, 'bytes', audio.type)

    if (!audio.size) {
      setIsTranscribing(false)
      return liveTranscriptRef.current.trim()
    }

    try {
      console.log('📡 Sending audio to STT backend…')
      const tr = await api.transcribeInterviewAudio(interviewId, audio)
      const whisperText = String(tr?.text || '').trim()

      console.log('📝 Whisper transcript:', whisperText)

      // Whisper is the final backend transcript. If it returns nothing, keep
      // the browser live transcript so the answer is not lost.
      const finalText = whisperText || liveTranscriptRef.current.trim()

      if (finalText) {
        setLiveTranscript(finalText)
        // Update editable textarea too (only if user hasn't manually edited yet)
        if (!userEditedRef.current) {
          setEditedTranscript(finalText)
        }
      }

      return finalText
    } finally {
      setIsTranscribing(false)
    }
  }

  async function waitForAdaptiveQuestion(breakSeconds = 0): Promise<any> {
    if (!interviewId) throw new Error('Interview session is unavailable.')

    const breakEnd = Date.now() + Math.max(0, breakSeconds) * 1000
    setAdaptivePrepActive(true)
    setAdaptivePrepError('')
    setAdaptivePrepMessage(
      breakSeconds > 0
        ? 'Take a short break while ARIA prepares your next questions.'
        : 'ARIA is preparing your next adaptive question…'
    )

    const delay = (ms: number) =>
      new Promise<void>(resolve => window.setTimeout(resolve, ms))

    let failedRetries = 0
    while (true) {
      const remaining = Math.max(0, Math.ceil((breakEnd - Date.now()) / 1000))
      setAdaptivePrepCountdown(remaining)

      let prepStatus: any
      try {
        prepStatus = await api.getInterviewPreparationStatus(interviewId)
      } catch {
        setAdaptivePrepMessage('Connecting to the question preparation service…')
        await delay(1200)
        continue
      }

      if (prepStatus?.status === 'failed') {
        if (failedRetries < 2) {
          failedRetries += 1
          setAdaptivePrepError('')
          setAdaptivePrepMessage(`Retrying question preparation (${failedRetries}/2)…`)
          try {
            const retry = await api.getNextInterviewQuestion(interviewId)
            if (retry?.nextQuestion && remaining <= 0) {
              setAdaptivePrepActive(false)
              return retry
            }
          } catch {
            // The next poll will show the most recent backend preparation state.
          }
          await delay(1200)
          continue
        }
        const message = String(prepStatus?.error || 'Question preparation failed. Check the backend logs and API key configuration.')
        setAdaptivePrepError(message)
        setAdaptivePrepMessage('ARIA could not prepare the next questions.')
        throw new Error(message)
      }

      if (remaining <= 0 && prepStatus?.ready) {
        const nextResult = await api.getNextInterviewQuestion(interviewId)
        if (nextResult?.nextQuestion) {
          setAdaptivePrepActive(false)
          setAdaptivePrepCountdown(0)
          setAdaptivePrepError('')
          return nextResult
        }
        if (nextResult?.preparationRequired) {
          setAdaptivePrepMessage('Finalizing your next question…')
        }
      } else if (remaining <= 0) {
        setAdaptivePrepMessage('Waiting for ARIA to finish preparing your questions…')
      }

      await delay(1000)
    }
  }

  async function retryAdaptivePreparation() {
    try {
      setAdaptivePrepError('')
      const result = await waitForAdaptiveQuestion(0)
      const raw = result?.nextQuestion
      if (!raw) throw new Error('No next question was returned.')
      const hardQuestionLimit = Number(plan?.total || setup?.questionCount || setup?.plannedQuestions || 0)
      if (hardQuestionLimit > 0 && questions.length >= hardQuestionLimit) {
        await finishInterview('planned_question_count')
        return
      }
      const next = normaliseQuestion(raw, questions.length + 1)
      setQuestions(prev => [...prev, next])
      setQIndex(prev => prev + 1)
      setWorkspaceOpen(null)
      setEvaluation(null)
      setLiveTranscript('')
      setEditedTranscript('')
      userEditedRef.current = false
      setTranscript(prev => [...prev, { speaker: 'ARIA', text: next.text }])
      setStatus('ARIA is preparing the next question…')
      window.setTimeout(() => speakQuestion(next.text, next.type), 300)
    } catch (error: any) {
      setAdaptivePrepActive(true)
      setAdaptivePrepError(error?.message || 'Question preparation failed. Please try again.')
    }
  }

  async function submitAnswer(answer: string, section: QType, codingSubmission: any = null) {
    if (!interviewId || !currentQ || busy) return
    setBusy(true)
    setStatus('AI is evaluating your answer…')

    // ✅ Optimistically mark question as completed immediately so the green tick
    // appears right away regardless of backend latency or early interview end.
    const submittedQId = currentQ.id
    setCompletedQs(prev => new Set([...prev, submittedQId]))
    setSavedAnswers(prev => ({ ...prev, [submittedQId]: answer }))
    setQuestionDrafts(prev => ({ ...prev, [submittedQId]: answer }))

    try {
      const submitPromise = api.submitInterviewAnswer(interviewId, {
        question: currentQ.text,
        transcript: answer,
        answer,
        section,
        questionType: currentQ.questionType,
        crossQuestion: currentQ.crossQuestion,
        isFollowUp: currentQ.isFollowUp,
        questionPayload: currentQ,
        codingSubmission,
      })
      inFlightSubmissionRef.current = submitPromise
      const result = await submitPromise

      setEvaluation(result.evaluation || null)

      // Record the answer once, then either show the prepared question or
      // enter the adaptive-preparation screen while the backend builds a queue.
      setTranscript(prev => {
        const lastEntry = prev[prev.length - 1]
        const alreadyHasUserAnswer =
          lastEntry && lastEntry.speaker === 'You' && lastEntry.text === answer
        const newEntries: { speaker: string; text: string }[] = []
        if (!alreadyHasUserAnswer) {
          newEntries.push({
            speaker: 'You',
            text: answer || (section === 'coding' ? '[Coding submission]' : section === 'sql' ? '[SQL submission]' : '[No answer]'),
          })
        }
        if (result.preparationRequired) {
          newEntries.push({
            speaker: 'ARIA',
            text: Number(result.breakSeconds || 0) > 0
              ? 'Let’s take a one-minute break while I prepare the next set of questions.'
              : 'I’m preparing the next question based on your answers so far.',
          })
        } else {
          const rawNext = result.nextQuestion
          const nextText = typeof rawNext === 'string'
            ? rawNext
            : rawNext?.text || rawNext?.question || rawNext?.prompt || 'Thank you. That completes the interview.'
          newEntries.push({ speaker: 'ARIA', text: nextText })
        }
        return [...prev, ...newEntries]
      })

      if (result.done) {
        await finishInterview(result?.summary?.completedBecause || 'interview_completed')
        return
      }

      // Frontend-side safety net: never append a question beyond the selected plan,
      // even if a stale backend response incorrectly includes another question.
      const hardQuestionLimit = Number(plan?.total || setup?.questionCount || setup?.plannedQuestions || 0)
      if (hardQuestionLimit > 0 && questions.length >= hardQuestionLimit) {
        await finishInterview('planned_question_count')
        return
      }

      let nextResponse = result
      if (result.preparationRequired) {
        nextResponse = await waitForAdaptiveQuestion(Number(result.breakSeconds || 0))
        const preparedText = nextResponse?.nextQuestion?.text ||
          nextResponse?.nextQuestion?.question ||
          nextResponse?.nextQuestion?.prompt ||
          'Please tell me more about your experience.'
        setTranscript(prev => [...prev, { speaker: 'ARIA', text: String(preparedText) }])
      }

      if (!nextResponse?.nextQuestion) {
        throw new Error('The interview service did not return the next question.')
      }

      const next = normaliseQuestion(nextResponse.nextQuestion, questions.length + 1)
      setQuestions(prev => [...prev, next])
      setQIndex(prev => prev + 1)
      setWorkspaceOpen(null)
      setEvaluation(null)
      setLiveTranscript('')
      setEditedTranscript('')
      userEditedRef.current = false
      setStatus('ARIA is preparing the next question…')

      // ARIA speaks first; candidate recording starts after speech ends.
      window.setTimeout(() => {
        speakQuestion(next.text, next.type)
      }, 300)
    } catch (e: any) {
      console.error(e)
      setStatus(e?.message || 'Answer processing failed')
    } finally {
      inFlightSubmissionRef.current = null
      setBusy(false)
    }
  }

  async function skipCurrentQuestion() {
    if (!currentQ || busy) return
    setStatus('Recording skipped answer for evaluation…')
    await submitAnswer("I don't know / pass", currentQ.type)
  }

  async function handleVerbalAnswer() {
    if (!currentQ || currentQ.type !== 'verbal' || busy) return

    setBusy(true)

    try {
      let finalText = ''

      // If microphone is still recording, stop it and get Whisper transcription.
      // If recording is already stopped AND the user edited the text, use their
      // edited version directly (no re-transcription needed).
      if (isListening) {
        setStatus('Finalizing speech-to-text…')
        const whisperText = await stopAndTranscribeAnswer()
        if (userEditedRef.current && (questionDrafts[currentQ.id] || editedTranscript).trim()) {
          finalText = (questionDrafts[currentQ.id] || editedTranscript).trim()
        } else {
          finalText = whisperText || (questionDrafts[currentQ.id] || editedTranscript).trim() || liveTranscriptRef.current.trim()
        }
      } else {
        finalText = (questionDrafts[currentQ.id] || editedTranscript).trim() || liveTranscriptRef.current.trim()
        setStatus('Submitting your answer…')
      }

      if (!finalText) {
        setStatus('No answer detected. Please speak or type your answer before submitting.')
        setBusy(false)
        return
      }

      setTranscript(prev => [
        ...prev,
        { speaker: 'You', text: finalText },
      ])

      setSavedAnswers(prev => ({ ...prev, [currentQ.id]: finalText }))
      setQuestionDrafts(prev => ({ ...prev, [currentQ.id]: finalText }))
      setLiveTranscript('')
      setEditedTranscript('')
      userEditedRef.current = false

      setBusy(false)
      await submitAnswer(finalText, 'verbal')
    } catch (e: any) {
      console.error('Speech-to-text failed:', e)
      setStatus(e?.message || 'Speech-to-text failed')
    } finally {
      setBusy(false)
    }
  }

  const handleWorkspaceSubmit = async (submission: any) => {
    if (!currentQ || busy) return

    if (currentQ.type === 'coding') {
      const code = String(submission?.code || '')
      const language = String(submission?.language || setup?.codingLanguage || 'python')
      if (!code.trim()) {
        setStatus('Please enter your code before submitting.')
        return
      }
      await submitAnswer(
        code,
        'coding',
        { code, language }
      )
    } else if (currentQ.type === 'sql') {
      const query = String(submission?.query || '')
      if (!query.trim()) {
        setStatus('Please enter your SQL query before submitting.')
        return
      }
      await submitAnswer(
        query,
        'sql',
        { query, language: 'sql' }
      )
    }
  }

  const handleNext = () => {
    if (qIndex < questions.length - 1) {
      if (isListening) {
        stopAnswerRecordingOnly()
      }
      const nextQ = questions[qIndex + 1]
      setQIndex(qIndex + 1)
      setWorkspaceOpen(null)
      userEditedRef.current = false
      setLiveTranscript('')
      setEditedTranscript(savedAnswers[nextQ.id] || questionDrafts[nextQ.id] || '')
      setTranscript(prev => [...prev, { speaker: 'ARIA', text: nextQ.ariaIntro }])
      speakQuestion(nextQ.text, nextQ.type)
    }
  }

  const handlePrevious = () => {
    if (qIndex > 0) {
      if (isListening) {
        stopAnswerRecordingOnly()
      }
      const prevQ = questions[qIndex - 1]
      setQIndex(qIndex - 1)
      setWorkspaceOpen(null)
      userEditedRef.current = false
      setLiveTranscript('')
      setEditedTranscript(savedAnswers[prevQ.id] || questionDrafts[prevQ.id] || '')
    }
  }

  async function finishInterview(reason = 'candidate_ended_interview') {
    interviewTerminatedRef.current = true
    try {
      window.speechSynthesis?.cancel()
    } catch { }
    stopLiveRecognition()
    if (answerRecorderRef.current?.state === 'recording') {
      try { answerRecorderRef.current.stop() } catch { }
    }
    setIsListening(false)
    if (inFlightSubmissionRef.current) {
      setStatus('Finalizing your answer submission…')
      try {
        await inFlightSubmissionRef.current
      } catch { }
    }
    setStatus('Saving interview report…')

    try {
      if (interviewId) {
        await api.completeInterview(interviewId, { reason })
      }
    } catch (e) {
      console.error('Interview completion save failed:', e)
    } finally {
      streamRef.current?.getTracks().forEach(t => t.stop())
      socketRef.current?.disconnect()
      onNavigate('reports')
    }
  }

  const handleEndInterview = async () => {
    await finishInterview('candidate_ended_interview')
  }

  const handleDismissTabWarning = () => {
    if (tabWarning?.isTermination) {
      void finishInterview('tab_switching_violation')
    } else {
      setTabWarning(null)
    }
  }

  // The selected question count includes cross-questions; progress must use
  // every completed question, matching the backend's hard cap.
  const completedQuestionCount = completedQs.size
  const progress = plan?.total
    ? Math.min(100, Math.round((completedQuestionCount / Number(plan.total)) * 100))
    : 0

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes waveAnim {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.6); }
        }
        @keyframes slideDownAlert {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .interview-room {
          background: #FAF9F5;
          min-height: 100dvh;
          width: 100%;
          overflow-x: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
        }
        .interview-room *, .interview-room *::before, .interview-room *::after {
          box-sizing: border-box;
        }
        .viva-brand {
          font-family: 'Outfit', sans-serif;
        }
        .wave-bar {
          animation: waveAnim 0.8s ease-in-out infinite;
        }
        .glow-ring {
          animation: glowPulse 2s ease-in-out infinite;
        }
        @media (max-width: 767px) {
          .desktop-grid {
            grid-template-columns: 1fr !important;
          }
          .video-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          .video-panel {
            min-height: 140px !important;
            border-radius: 10px !important;
          }
          .question-panel {
            padding: 10px 12px !important;
          }
          .meeting-controls {
            padding: 6px 8px !important;
            gap: 4px !important;
          }
          .control-btn {
            width: 40px !important;
            height: 40px !important;
            font-size: 16px !important;
          }
          .control-label {
            display: none !important;
          }
          .question-progress {
            gap: 3px !important;
          }
          .question-dot {
            width: 24px !important;
            height: 24px !important;
            font-size: 9px !important;
          }
          .nav-btn {
            padding: 6px 12px !important;
            font-size: 11px !important;
          }
          .workspace-btn {
            padding: 5px 12px !important;
            font-size: 11px !important;
          }
          .transcript-toggle {
            display: flex !important;
          }
          .transcript-panel {
            display: flex !important;
            min-height: 220px !important;
            max-height: 38vh !important;
            border-left: none !important;
            border-top: 1px solid rgba(0,0,0,0.06) !important;
            padding: 10px 12px !important;
          }
          .top-bar-time {
            font-size: 11px !important;
          }
        }
        @media (min-width: 768px) {
          .video-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .video-panel {
            min-height: 280px !important;
            border-radius: 14px !important;
          }
          .transcript-panel {
            display: flex !important;
          }
          .transcript-toggle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          input, textarea, select {
            font-size: 16px !important;
          }
        }
      `}</style>

      <div className="interview-room">
        {/* TOP BAR */}
        <div
          style={{
            background: '#FAF9F5',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            padding: isMobile ? '8px 12px' : '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
            <div
              style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: isMobile ? '11px' : '13px',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 600, fontSize: isMobile ? '14px' : '16px', color: '#1a1a2e', fontFamily: 'Outfit, sans-serif' }}>
              VIVA
            </span>
            <span
              style={{
                fontSize: isMobile ? '8px' : '10px',
                color: '#ef4444',
                fontWeight: 600,
                background: 'rgba(239,68,68,0.08)',
                padding: '2px 8px',
                borderRadius: '100px',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              ● LIVE
            </span>
            <span className="top-bar-time" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isMobile ? '11px' : '13px', color: '#4a4a6a' }}>
              {fmt(seconds)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
            <div className="question-progress" style={{ display: 'flex', gap: isMobile ? '3px' : '4px' }}>
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="question-dot"
                  style={{
                    width: isMobile ? '24px' : '28px',
                    height: isMobile ? '24px' : '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '9px' : '10px',
                    background: completedQs.has(q.id)
                      ? '#10b981'
                      : i === qIndex
                        ? '#7c3aed'
                        : 'rgba(0,0,0,0.06)',
                    color: completedQs.has(q.id) || i === qIndex ? '#fff' : '#8a8aa8',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: i === qIndex ? '2px solid #7c3aed' : 'none',
                  }}
                  onClick={() => {
                    if (isListening) {
                      stopAnswerRecordingOnly()
                    }
                    setQIndex(i)
                    setWorkspaceOpen(null)
                    userEditedRef.current = false
                    setLiveTranscript('')
                    setEditedTranscript(savedAnswers[q.id] || questionDrafts[q.id] || '')
                  }}
                  title={q.category}
                >
                  {completedQs.has(q.id) ? '✓' : typeIcon[q.type]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div
          className="desktop-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
            minHeight: isMobile ? 'auto' : 'calc(100vh - 60px)',
            paddingBottom: isMobile ? '76px' : '88px',
            gap: '0',
          }}
        >
          {/* LEFT: VIDEO + QUESTION */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: isMobile ? '6px' : '16px',
              gap: isMobile ? '6px' : '12px',
              overflow: 'hidden',
            }}
          >
            {/* Video Grid */}
            <div
              className="video-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: isMobile ? '6px' : '12px',
                flexShrink: 0,
              }}
            >
              {/* 30-SECOND PRE-LOADING & PREPARATION OVERLAY */}
              {isPrepPhase && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: 'linear-gradient(135deg, #0d0d1a, #1a1a2e)',
                    borderRadius: isMobile ? '10px' : '14px',
                    minHeight: isMobile ? '180px' : '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isMobile ? '16px' : '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid rgba(124,58,237,0.3)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? '48px' : '64px',
                      height: isMobile ? '48px' : '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 30px rgba(124,58,237,0.5)',
                      marginBottom: '12px',
                    }}
                  >
                    <BotAvatarIcon size={isMobile ? 24 : 32} color="#fff" />
                  </div>

                  <h3
                    style={{
                      fontSize: isMobile ? '15px' : '18px',
                      fontWeight: 700,
                      fontFamily: 'Outfit, sans-serif',
                      color: '#ffffff',
                      margin: '0 0 6px 0',
                    }}
                  >
                    ARIA Pre-loading AI Interview Question Bank...
                  </h3>

                  <p
                    style={{
                      fontSize: isMobile ? '11px' : '13px',
                      color: '#a0a0c0',
                      maxWidth: '460px',
                      margin: '0 0 16px 0',
                      textAlign: 'center',
                      lineHeight: 1.4,
                    }}
                  >
                    Loading domain questions (Easy, Medium, Hard, Pseudocode & Coding) into backend session. Your interview begins in 30 seconds.
                  </p>

                  {/* COUNTDOWN TIMER */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <div
                      style={{
                        background: 'rgba(124,58,237,0.15)',
                        padding: '6px 18px',
                        borderRadius: '100px',
                        border: '1px solid rgba(124,58,237,0.4)',
                        color: '#a78bfa',
                        fontWeight: 800,
                        fontSize: isMobile ? '16px' : '20px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      00:{prepCountdown < 10 ? `0${prepCountdown}` : prepCountdown}
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      height: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '100px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${((30 - prepCountdown) / 30) * 100}%`,
                        background: 'linear-gradient(90deg, #7c3aed, #10b981)',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>

                  <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#6a6a8a', fontFamily: 'Inter, sans-serif' }}>
                    {prepCountdown > 20
                      ? '⚡ [1/3] Initializing Camera & Proctoring Feeds...'
                      : prepCountdown > 10
                        ? '⚡ [2/3] Pre-loading 15-Question Bank from Groq LLM Backend...'
                        : '⚡ [3/3] Finalizing Session & Voice Synthesis Model...'}
                  </div>
                </div>
              )}

              {/* ARIA - AI Interviewer */}
              <div
                className="video-panel"
                style={{
                  background: 'linear-gradient(145deg, #1a1a2e, #2d1b4e)',
                  borderRadius: isMobile ? '10px' : '14px',
                  minHeight: isMobile ? '140px' : '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="glow-ring"
                  style={{
                    position: 'absolute',
                    width: isMobile ? '100px' : '180px',
                    height: isMobile ? '100px' : '180px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
                  }}
                />

                <div
                  style={{
                    width: isMobile ? '60px' : '100px',
                    height: isMobile ? '60px' : '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '28px' : '44px',
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: '0 0 40px rgba(124,58,237,0.3)',
                  }}
                >
                  <BotAvatarIcon size={isMobile ? 28 : 44} color="#fff" />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: isMobile ? '2px' : '4px',
                    alignItems: 'center',
                    height: isMobile ? '16px' : '28px',
                    marginTop: isMobile ? '6px' : '10px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {audioWave.map((h, i) => (
                    <div
                      key={i}
                      className="wave-bar"
                      style={{
                        width: isMobile ? '2px' : '3px',
                        height: isMobile ? `${h * 1.2}px` : `${h * 2.2}px`,
                        background: isAriaSpeaking ? '#7c3aed' : 'rgba(124,58,237,0.3)',
                        borderRadius: '2px',
                        transition: 'height 0.3s ease, background 0.3s ease',
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: isMobile ? '6px' : '10px',
                    left: isMobile ? '6px' : '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? '5px' : '7px',
                      height: isMobile ? '5px' : '7px',
                      borderRadius: '50%',
                      background: isAriaSpeaking ? '#10b981' : '#6a6a8a',
                    }}
                  />
                  <span
                    style={{
                      fontSize: isMobile ? '8px' : '11px',
                      color: '#fff',
                      fontWeight: 600,
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    ARIA
                  </span>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: isMobile ? '6px' : '10px',
                    right: isMobile ? '6px' : '10px',
                    fontSize: isMobile ? '7px' : '10px',
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  AI
                </div>
              </div>

              {/* You - Real Webcam */}
              <div
                className="video-panel"
                style={{
                  background: '#0a0a1a',
                  borderRadius: isMobile ? '10px' : '14px',
                  minHeight: isMobile ? '140px' : '280px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isCamOff ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', height: '100%', justifyContent: 'center' }}>
                    <VideoOffIcon size={isMobile ? 28 : 40} color="rgba(255,255,255,0.35)" />
                    <span style={{ fontSize: isMobile ? '10px' : '13px' }}>Camera off</span>
                  </div>
                ) : cameraError ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,0.7)', fontSize: 12 }}>
                    {cameraError}
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                )}

                {!isCamOff && !cameraError && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '64%', height: '76%', border: `2px solid ${proctor.face_inside_circle ? '#10b981' : '#f59e0b'}`, borderRadius: '50%' }} />
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: isMobile ? '6px' : '10px', left: isMobile ? '6px' : '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: isMobile ? '5px' : '7px', height: isMobile ? '5px' : '7px', borderRadius: '50%', background: !isMuted ? '#10b981' : '#ef4444' }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '8px' : '11px', color: '#fff', fontWeight: 600 }}>
                    {!isMuted ? <MicIcon size={isMobile ? 9 : 12} color="#fff" /> : <MicOffIcon size={isMobile ? 9 : 12} color="#fff" />} You
                  </span>
                </div>
              </div>
            </div>

            {/* Proctoring status */}
            <div style={{ background: '#fff', borderRadius: isMobile ? '10px' : '12px', padding: isMobile ? '8px 10px' : '10px 14px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: proctorConnected ? '#10b981' : '#ef4444' }}>● {proctorConnected ? 'PROCTORING LIVE' : 'PROCTORING OFFLINE'}</span>
              <span style={{ fontSize: 10, color: proctor.face_detected && proctor.face_inside_circle ? '#10b981' : '#f59e0b' }}>Face: {proctor.face_detected ? (proctor.face_inside_circle ? 'Centered' : 'Misaligned') : 'Not detected'}</span>
              <span style={{ fontSize: 10, color: proctor.looking_direction === 'CENTER' ? '#10b981' : '#ef4444' }}>Looking: {proctor.looking_direction}</span>
              {proctor.multiple_people && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ Multiple people ({proctor.people_count})</span>}
              {proctor.cell_phone && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ Cell phone</span>}
              {proctor.hand_carrying_object && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ Hand + object</span>}
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: proctor.warning_count ? '#ef4444' : '#10b981' }}>Warnings: {proctor.warning_count}/{proctor.max_warnings}</span>
              {(proctor.last_warning_reason || proctor.terminated) && <div style={{ width: '100%', fontSize: 11, fontWeight: 600, color: proctor.terminated ? '#ef4444' : '#b45309' }}>
                {proctor.terminated ? 'INTERVIEW TERMINATED — ' : 'Latest warning: '}{proctor.last_warning_reason || 'Maximum warnings reached'}
              </div>}
              {!proctor.face_detected && proctor.no_face_duration > 0 && <div style={{ width: '100%', fontSize: 10, color: '#b45309' }}>No face: {proctor.no_face_duration.toFixed(1)}s / 5.0s</div>}
              {(proctor.looking_direction === 'LEFT' || proctor.looking_direction === 'RIGHT') && <div style={{ width: '100%', fontSize: 10, color: '#b45309' }}>Looking {proctor.looking_direction.toLowerCase()}: {proctor.side_duration.toFixed(1)}s / 2.0s</div>}
            </div>

            {/* Question Panel */}
            <div
              className="question-panel"
              style={{
                background: '#fff',
                borderRadius: isMobile ? '10px' : '14px',
                padding: isMobile ? '10px 12px' : '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '6px' : '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: isMobile ? '9px' : '10px',
                      background: 'rgba(124,58,237,0.08)',
                      color: '#7c3aed',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontWeight: 600,
                    }}
                  >
                    Q{currentQ.id}/{plan?.total || '…'}
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? '9px' : '10px',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      fontWeight: 600,
                      background: `${typeColor[currentQ.type]}15`,
                      color: typeColor[currentQ.type],
                      border: `1px solid ${typeColor[currentQ.type]}25`,
                    }}
                  >
                    {typeIcon[currentQ.type]} {currentQ.category}
                  </span>
                  {currentQ.difficultyTier && (
                    <span
                      style={{
                        fontSize: isMobile ? '9px' : '10px',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontWeight: 600,
                        background:
                          currentQ.difficultyTier === 'Easy'
                            ? '#ecfdf5'
                            : currentQ.difficultyTier === 'Medium'
                              ? '#fffbeb'
                              : '#fef2f2',
                        color:
                          currentQ.difficultyTier === 'Easy'
                            ? '#059669'
                            : currentQ.difficultyTier === 'Medium'
                              ? '#d97706'
                              : '#dc2626',
                        border:
                          currentQ.difficultyTier === 'Easy'
                            ? '1px solid #a7f3d0'
                            : currentQ.difficultyTier === 'Medium'
                              ? '1px solid #fde68a'
                              : '1px solid #fecaca',
                      }}
                    >
                      {currentQ.difficultyTier === 'Easy'
                        ? '🌱 Easy'
                        : currentQ.difficultyTier === 'Medium'
                          ? '⚡ Medium'
                          : '🔥 Hard'}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: isMobile ? '13px' : '16px',
                    color: '#1a1a2e',
                    lineHeight: 1.6,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {currentQ.text}
                </p>
              </div>

              {!isCompleted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={() => void skipCurrentQuestion()}
                    disabled={busy || isAriaSpeaking}
                    className="nav-btn"
                    style={{ padding: '6px 11px', borderRadius: 7, border: '1px solid #d0d5dd', background: '#fff', color: '#667085', cursor: busy || isAriaSpeaking ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: busy || isAriaSpeaking ? 0.5 : 1 }}
                  >
                    Skip / I don't know →
                  </button>
                </div>
              )}

              {isPractical && !isCompleted && (
                <div
                  style={{
                    marginTop: isMobile ? '8px' : '10px',
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    borderRadius: '6px',
                    background: `${typeColor[currentQ.type]}10`,
                    border: `1px solid ${typeColor[currentQ.type]}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: isMobile ? '4px' : '8px',
                  }}
                >
                  <span style={{ fontSize: isMobile ? '11px' : '13px', color: typeColor[currentQ.type], fontWeight: 500 }}>
                    {currentQ.type === 'coding' ? '⌨️' : '🗄️'} {currentQ.type === 'coding' ? 'Coding' : 'SQL'} ready
                  </span>
                  <button
                    onClick={() => setWorkspaceOpen(currentQ.type === 'sql' ? 'sql' : 'coding')}
                    className="workspace-btn"
                    style={{
                      padding: isMobile ? '5px 12px' : '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: isMobile ? '11px' : '13px',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'opacity 0.15s',
                      touchAction: 'manipulation',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Open →
                  </button>
                </div>
              )}

              {isCompleted && (
                <div
                  style={{
                    marginTop: isMobile ? '6px' : '8px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    color: '#10b981',
                    fontSize: isMobile ? '10px' : '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ✓ Submitted
                </div>
              )}

              <div style={{ marginTop: isMobile ? '8px' : '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '9px' : '10px', color: '#8a8aa8', marginBottom: '2px' }}>
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div
                  style={{
                    height: isMobile ? '2px' : '3px',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Verbal answer controls + live transcript */}
            {currentQ?.type === 'verbal' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: isMobile ? '8px 0' : '10px 0',
                }}
              >
                {isCompleted ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: isMobile ? '12px' : '13px' }}>
                      <span>✓</span>
                      <span>Answer Submitted & Saved</span>
                    </div>
                    {qIndex < questions.length - 1 && (
                      <button
                        onClick={handleNext}
                        className="nav-btn"
                        style={{
                          padding: isMobile ? '5px 10px' : '6px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#7c3aed',
                          color: '#fff',
                          fontSize: isMobile ? '11px' : '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Next Question →
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() => void startAnswerRecording()}
                      disabled={busy || isAriaSpeaking || isListening}
                      className="nav-btn"
                      style={{
                        padding: isMobile ? '7px 12px' : '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(124,58,237,0.2)',
                        background: isListening ? 'rgba(124,58,237,0.08)' : '#fff',
                        color: '#7c3aed',
                        cursor: busy || isAriaSpeaking || isListening ? 'not-allowed' : 'pointer',
                        fontSize: isMobile ? '11px' : '13px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        opacity: busy || isAriaSpeaking ? 0.55 : 1,
                      }}
                    >
                      🎙️ {isListening ? 'Listening…' : 'Start Listening'}
                    </button>

                    <button
                      onClick={stopAnswerRecordingOnly}
                      disabled={!isListening || busy}
                      className="nav-btn"
                      style={{
                        padding: isMobile ? '7px 12px' : '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: isListening ? 'rgba(239,68,68,0.06)' : '#fff',
                        color: '#ef4444',
                        cursor: !isListening || busy ? 'not-allowed' : 'pointer',
                        fontSize: isMobile ? '11px' : '13px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        opacity: !isListening || busy ? 0.45 : 1,
                      }}
                    >
                      ⏹ Stop
                    </button>

                    <button
                      onClick={() => void handleVerbalAnswer()}
                      disabled={busy || isTranscribing || (!isListening && !((questionDrafts[currentQ.id] ?? editedTranscript).trim() || liveTranscript.trim()))}
                      className="nav-btn"
                      style={{
                        padding: isMobile ? '7px 14px' : '9px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: '#fff',
                        cursor: busy || (!isListening && !((questionDrafts[currentQ.id] ?? editedTranscript).trim() || liveTranscript.trim())) ? 'not-allowed' : 'pointer',
                        fontSize: isMobile ? '11px' : '13px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        opacity: busy || (!isListening && !((questionDrafts[currentQ.id] ?? editedTranscript).trim() || liveTranscript.trim())) ? 0.5 : 1,
                      }}
                    >
                      {isTranscribing ? 'Transcribing…' : 'Finish & Submit →'}
                    </button>

                    <span
                      style={{
                        fontSize: isMobile ? '10px' : '11px',
                        color: isListening ? '#10b981' : '#8a8aa8',
                        fontWeight: 600,
                      }}
                    >
                      {isListening ? '● Live' : isAriaSpeaking ? 'ARIA speaking' : 'Ready'}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    border: '1px solid rgba(6,182,212,0.20)',
                    background: 'rgba(6,182,212,0.04)',
                    borderRadius: '10px',
                    padding: isMobile ? '8px 10px' : '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#06b6d4',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Your Answer
                      {isListening && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: '#06b6d4',
                            animation: 'pulse 1s infinite',
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: '9px', color: '#8a8aa8', fontStyle: 'italic' }}>
                      {isCompleted
                        ? 'Submitted'
                        : isListening
                          ? 'Listening… Click Stop to edit'
                          : 'You can edit before submitting'}
                    </span>
                  </div>
                  <textarea
                    value={isCompleted ? (savedAnswers[currentQ.id] || editedTranscript) : (questionDrafts[currentQ.id] ?? editedTranscript)}
                    onChange={e => {
                      if (isCompleted) return;
                      const val = e.target.value;
                      userEditedRef.current = true;
                      setEditedTranscript(val);
                      setQuestionDrafts(prev => ({ ...prev, [currentQ.id]: val }));
                    }}
                    readOnly={isCompleted || isListening}
                    placeholder={
                      isCompleted
                        ? 'Your submitted answer.'
                        : isListening
                          ? 'Your speech will appear here as you speak… Click Stop to edit.'
                          : 'Speak your answer, then edit here if needed before submitting…'
                    }
                    rows={4}
                    style={{
                      width: '100%',
                      fontSize: isMobile ? '11px' : '13px',
                      lineHeight: 1.6,
                      color: (isCompleted ? savedAnswers[currentQ.id] : (questionDrafts[currentQ.id] ?? editedTranscript)) ? '#27324a' : '#9aa0b5',
                      background: isListening ? 'transparent' : isCompleted ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.7)',
                      border: isListening ? 'none' : isCompleted ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(6,182,212,0.25)',
                      borderRadius: '6px',
                      padding: isListening ? '0' : '8px',
                      resize: isCompleted ? 'none' : 'vertical',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                      cursor: isListening || isCompleted ? 'default' : 'text',
                      minHeight: isMobile ? '60px' : '80px',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px' }}>
                <button
                  onClick={handlePrevious}
                  disabled={qIndex === 0}
                  className="nav-btn"
                  style={{
                    padding: isMobile ? '6px 12px' : '10px 20px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: qIndex === 0 ? 'rgba(0,0,0,0.03)' : '#fff',
                    color: qIndex === 0 ? '#b0b0c8' : '#1a1a2e',
                    cursor: qIndex === 0 ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '11px' : '13px',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s',
                    fontWeight: 500,
                    touchAction: 'manipulation',
                  }}
                >
                  ← Prev
                </button>
                <button
                  onClick={handleNext}
                  disabled={qIndex === questions.length - 1}
                  className="nav-btn"
                  style={{
                    padding: isMobile ? '6px 14px' : '10px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    background: qIndex === questions.length - 1 ? 'rgba(0,0,0,0.05)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: qIndex === questions.length - 1 ? '#b0b0c8' : '#fff',
                    cursor: qIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '11px' : '13px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    transition: 'opacity 0.15s',
                    touchAction: 'manipulation',
                  }}
                >
                  Next →
                </button>
              </div>

              <button
                onClick={() => setShowEndModal(true)}
                className="nav-btn"
                style={{
                  padding: isMobile ? '6px 12px' : '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.04)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: isMobile ? '11px' : '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  touchAction: 'manipulation',
                }}
              >
                Leave
              </button>
            </div>
          </div>

          {/* RIGHT: TRANSCRIPT (Desktop only) */}
          <div
            className="transcript-panel"
            style={{
              borderLeft: '1px solid rgba(0,0,0,0.06)',
              background: '#FAF9F5',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <h4
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#8a8aa8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '12px',
                flexShrink: 0,
              }}
            >
              Transcript
            </h4>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {transcript.map((line, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: line.speaker === 'ARIA' ? '#7c3aed' : '#06b6d4',
                      marginBottom: '2px',
                    }}
                  >
                    {line.speaker}
                  </div>
                  <div style={{ fontSize: '13px', color: '#3a3a5a', lineHeight: 1.6 }}>{line.text}</div>
                </div>
              ))}
              {currentQ.type === 'verbal' && liveTranscript && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '9px',
                    background: 'rgba(6,182,212,0.05)',
                    border: '1px solid rgba(6,182,212,0.12)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', marginBottom: '3px' }}>
                    YOU • LIVE
                  </div>
                  <div style={{ fontSize: isMobile ? '12px' : '13px', color: '#334155', lineHeight: 1.55, wordBreak: 'break-word' }}>
                    {liveTranscript}
                    {isListening && (
                      <span style={{ marginLeft: 5, color: '#06b6d4' }}>●</span>
                    )}
                  </div>
                </div>
              )}

              {!liveTranscript && currentQ.type === 'verbal' && isListening && (
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#06b6d4', marginBottom: '2px' }}>YOU</div>
                  <div style={{ fontSize: '12px', color: '#8a8aa8', lineHeight: 1.6 }}>
                    Listening for your answer…
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MEETING CONTROLS */}
        <div
          className="meeting-controls"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(6,6,20,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: isMobile ? '6px 8px' : '12px 28px',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            zIndex: 30,
            gap: isMobile ? '4px' : '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px', justifySelf: 'start' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isMobile ? '12px' : '15px', color: '#c4b5fd', fontWeight: 600 }}>
              {fmt(seconds)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', justifySelf: 'center' }}>
            <button
              onClick={() => { setIsMuted(m => { const next = !m; const t = streamRef.current?.getAudioTracks()[0]; if (t) t.enabled = !next; return next }) }}
              className="control-btn"
              style={{
                width: isMobile ? '40px' : '52px',
                height: isMobile ? '40px' : '52px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: isMobile ? '16px' : '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s',
                boxShadow: isMuted ? '0 0 18px rgba(239,68,68,0.4)' : 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isMuted ? '#dc2626' : 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.12)' }}
              aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOffIcon size={isMobile ? 18 : 22} /> : <MicIcon size={isMobile ? 18 : 22} />}
            </button>

            <button
              onClick={() => setIsCamOff(c => !c)}
              className="control-btn"
              style={{
                width: isMobile ? '40px' : '52px',
                height: isMobile ? '40px' : '52px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: isCamOff ? '#ef4444' : 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: isMobile ? '16px' : '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s',
                boxShadow: isCamOff ? '0 0 18px rgba(239,68,68,0.4)' : 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isCamOff ? '#dc2626' : 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isCamOff ? '#ef4444' : 'rgba(255,255,255,0.12)' }}
              aria-label={isCamOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isCamOff ? <VideoOffIcon size={isMobile ? 18 : 22} /> : <VideoIcon size={isMobile ? 18 : 22} />}
            </button>

            <button
              className="control-btn"
              style={{
                width: isMobile ? '40px' : '52px',
                height: isMobile ? '40px' : '52px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: isMobile ? '16px' : '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
              aria-label="Share screen"
            >
              <ScreenShareIcon size={isMobile ? 18 : 22} />
            </button>

            {isMobile && (
              <button
                onClick={() => setShowEndModal(true)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.18s',
                  boxShadow: '0 0 20px rgba(239,68,68,0.35)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef4444' }}
                aria-label="Leave interview"
              >
                <LeaveCallIcon size={18} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '12px', justifySelf: 'end' }}>
            {isPractical && !isCompleted && (
              <button
                onClick={() => setWorkspaceOpen(currentQ.type === 'sql' ? 'sql' : 'coding')}
                style={{
                  padding: isMobile ? '4px 10px' : '8px 18px',
                  borderRadius: '100px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: isMobile ? '10px' : '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 20px rgba(124,58,237,0.35)',
                  transition: 'opacity 0.15s',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              >
                {isMobile ? '⌨️' : 'Open Workspace'}
              </button>
            )}

            {!isMobile && (
              <button
                onClick={() => setShowEndModal(true)}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.18s',
                  boxShadow: '0 0 20px rgba(239,68,68,0.35)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef4444' }}
                aria-label="Leave interview"
              >
                <LeaveCallIcon size={22} />
              </button>
            )}
          </div>
        </div>

        {/* WORKSPACE OVERLAYS */}
        {workspaceOpen === 'coding' && (
          <CodingWorkspace
            question={currentQ}
            isMobile={isMobile}
            onSubmit={handleWorkspaceSubmit}
            onClose={() => setWorkspaceOpen(null)}
          />
        )}

        {workspaceOpen === 'sql' && (
          <SQLWorkspace
            question={currentQ}
            isMobile={isMobile}
            onSubmit={handleWorkspaceSubmit}
            onClose={() => setWorkspaceOpen(null)}
          />
        )}

        {/* TAB SWITCH WARNING ALERT (Pinned at top of screen) */}
        {tabWarning?.open && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: isMobile ? '16px' : '32px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >
            <div
              style={{
                maxWidth: '520px',
                width: '100%',
                background: tabWarning.count === 1
                  ? '#FFFBEB'
                  : tabWarning.count === 2
                    ? '#FEF2F2'
                    : '#18181B',
                border: tabWarning.count === 1
                  ? '2px solid #F59E0B'
                  : tabWarning.count === 2
                    ? '2px solid #EF4444'
                    : '2px solid #DC2626',
                borderRadius: '16px',
                padding: isMobile ? '18px 16px' : '22px 24px',
                boxShadow: tabWarning.count === 1
                  ? '0 20px 45px rgba(245, 158, 11, 0.28)'
                  : tabWarning.count === 2
                    ? '0 20px 45px rgba(239, 68, 68, 0.35)'
                    : '0 25px 60px rgba(220, 38, 38, 0.5)',
                color: tabWarning.count >= 3 ? '#fff' : '#18181B',
                fontFamily: 'Inter, sans-serif',
                animation: 'slideDownAlert 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: tabWarning.count === 1
                      ? 'rgba(245, 158, 11, 0.15)'
                      : tabWarning.count === 2
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(220, 38, 38, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                  }}
                >
                  {tabWarning.count === 1 ? '⚠️' : tabWarning.count === 2 ? '🚨' : '⛔'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: isMobile ? '15px' : '17px',
                      fontWeight: 700,
                      color: tabWarning.count === 1
                        ? '#B45309'
                        : tabWarning.count === 2
                          ? '#DC2626'
                          : '#EF4444',
                    }}
                  >
                    {tabWarning.title}
                  </h3>
                  <div style={{ fontSize: '11px', color: tabWarning.count >= 3 ? '#A1A1AA' : '#6B7280', fontWeight: 500 }}>
                    Security Proctor Violation
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: isMobile ? '13px' : '14px',
                  lineHeight: 1.6,
                  color: tabWarning.count >= 3 ? '#E4E4E7' : '#374151',
                }}
              >
                {tabWarning.message}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: `1px solid ${tabWarning.count >= 3 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: tabWarning.count === 1
                      ? '#D97706'
                      : tabWarning.count === 2
                        ? '#EF4444'
                        : '#F87171',
                  }}
                >
                  {tabWarning.count < 3 ? `Strike ${tabWarning.count} of 2 (3rd terminates)` : 'Session Terminated'}
                </div>

                <button
                  onClick={handleDismissTabWarning}
                  style={{
                    padding: isMobile ? '8px 20px' : '10px 26px',
                    borderRadius: '8px',
                    border: 'none',
                    background: tabWarning.count === 1
                      ? '#F59E0B'
                      : tabWarning.count === 2
                        ? '#EF4444'
                        : '#DC2626',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: isMobile ? '12px' : '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {tabWarning.count >= 3 ? 'View Report →' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROCTOR WARNING POPUP — same modal-style interruption as tab-switch warnings */}
        {proctorWarningPopup && !tabWarning?.open && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 999998, background: 'rgba(15,23,42,.58)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: isMobile ? '16px' : '32px 16px' }}>
            <div role="alertdialog" aria-modal="true" style={{ width: '100%', maxWidth: 520, background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: 16, padding: isMobile ? '18px 16px' : '22px 24px', boxShadow: '0 20px 45px rgba(245,158,11,.28)', color: '#18181B', animation: 'slideDownAlert .3s cubic-bezier(.16,1,.3,1)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}><span style={{ fontSize: 26 }}>⚠️</span><div><h3 style={{ margin: 0, color: '#B45309', fontSize: 17 }}>Proctoring Warning</h3><div style={{ color: '#6B7280', fontSize: 11, marginTop: 3 }}>Warning {proctorWarningPopup.count}</div></div></div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#374151', margin: '0 0 16px' }}>{proctorWarningPopup.reason}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 12 }}><span style={{ fontSize: 11, color: '#92400E' }}>Please correct this and continue your interview.</span><button onClick={() => setProctorWarningPopup(null)} style={{ padding: '9px 22px', borderRadius: 8, border: 0, background: '#F59E0B', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>OK</button></div>
            </div>
          </div>
        )}

        {/* ADAPTIVE QUESTION PREPARATION / ONE-MINUTE BREAK */}
        {adaptivePrepActive && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preparing next interview questions"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 120,
              background: 'rgba(13, 13, 26, 0.82)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 480,
                background: '#FAF9F5',
                borderRadius: 22,
                padding: isMobile ? '28px 22px' : '38px 34px',
                textAlign: 'center',
                boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                border: '1px solid rgba(124,58,237,0.16)',
              }}
            >
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: '50%',
                  margin: '0 auto 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 28,
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  animation: 'pulse 1.8s ease-in-out infinite',
                }}
              >
                ✦
              </div>
              <h2 style={{ margin: '0 0 10px', color: '#1a1a2e', fontSize: isMobile ? 21 : 25 }}>
                {adaptivePrepCountdown > 0 ? 'Take a short break' : 'ARIA is preparing'}
              </h2>
              <p style={{ margin: '0 auto 20px', maxWidth: 360, color: '#686887', fontSize: 14, lineHeight: 1.65 }}>
                {adaptivePrepError || adaptivePrepMessage}
              </p>
              {adaptivePrepCountdown > 0 && (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 42, fontWeight: 700, color: '#7c3aed', marginBottom: 14 }}>
                  {fmt(adaptivePrepCountdown)}
                </div>
              )}
              {!adaptivePrepError && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#8a8aa8', fontSize: 12 }}>
                  <span className="wave-bar" style={{ width: 5, height: 16, borderRadius: 3, background: '#7c3aed' }} />
                  <span className="wave-bar" style={{ width: 5, height: 22, borderRadius: 3, background: '#7c3aed', animationDelay: '0.12s' }} />
                  <span className="wave-bar" style={{ width: 5, height: 12, borderRadius: 3, background: '#7c3aed', animationDelay: '0.24s' }} />
                  <span>Using your previous answers to personalize the next questions</span>
                </div>
              )}
              {adaptivePrepError && (
                <button
                  onClick={() => void retryAdaptivePreparation()}
                  style={{
                    marginTop: 20,
                    padding: '11px 22px',
                    border: 0,
                    borderRadius: 9,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Retry preparation
                </button>
              )}
            </div>
          </div>
        )}

        {/* END MODAL */}
        {showEndModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#FAF9F5',
                borderRadius: '20px',
                padding: isMobile ? '24px 20px' : '36px 40px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ fontSize: isMobile ? '32px' : '40px', marginBottom: '12px' }}>⏹️</div>
              <h3
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                  fontSize: isMobile ? '18px' : '22px',
                  color: '#1a1a2e',
                  marginBottom: '8px',
                }}
              >
                End Interview?
              </h3>
              <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#6a6a8a', lineHeight: 1.6, marginBottom: '6px' }}>
                {completedQs.size} of {questions.length} questions completed
              </p>
              <p style={{ fontSize: isMobile ? '11px' : '13px', color: '#8a8aa8', lineHeight: 1.5, marginBottom: '20px' }}>
                Your report will be generated with scores for all challenges.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowEndModal(false)}
                  style={{
                    padding: isMobile ? '8px 18px' : '11px 28px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#fff',
                    color: '#1a1a2e',
                    cursor: 'pointer',
                    fontSize: isMobile ? '12px' : '14px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    touchAction: 'manipulation',
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={handleEndInterview}
                  style={{
                    padding: isMobile ? '8px 18px' : '11px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: isMobile ? '12px' : '14px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    touchAction: 'manipulation',
                  }}
                >
                  End & Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// CODING WORKSPACE
function CodingWorkspace({
  question,
  isMobile,
  onSubmit,
  onClose,
}: {
  question: Question
  isMobile: boolean
  onSubmit: (submission: any) => void
  onClose: () => void
}) {
  const defaultLanguage = String(question?.language || question?.problem?.language || 'python').toLowerCase()
  const [lang, setLang] = useState(defaultLanguage === 'javascript' ? 'JavaScript' : defaultLanguage === 'cpp' ? 'C++' : defaultLanguage === 'java' ? 'Java' : 'Python')
  const initialCode =
    question?.problem?.starterCode?.[defaultLanguage] ||
    question?.problem?.starterCode?.python ||
    [
      'def longest_substring_without_repeating(s: str) -> int:',
      '    """',
      '    Find the length of the longest substring without repeating characters.',
      '    """',
      '    char_map = {}',
      '    left = 0',
      '    max_len = 0',
      '',
      '    for right, char in enumerate(s):',
      '        if char in char_map and char_map[char] >= left:',
      '            left = char_map[char] + 1',
      '        char_map[char] = right',
      '        max_len = max(max_len, right - left + 1)',
      '',
      '    return max_len',
    ].join('\n')
  const [code, setCode] = useState(initialCode)

  const [ran, setRan] = useState(false)

  const languages = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go']
  const testCases = [
    { input: '"abcabcbb"', expected: '3', status: 'passed' },
    { input: '"bbbbb"', expected: '1', status: 'passed' },
    { input: '"pwwkew"', expected: '3', status: 'pending' },
    { input: '""', expected: '0', status: 'pending' },
  ]

  const resetCode = () => {
    setCode(question?.problem?.starterCode?.[defaultLanguage] || question?.problem?.starterCode?.python || initialCode)
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 80,
          animation: 'fadeIn 0.25s ease',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          ...(isMobile
            ? {
              bottom: 0,
              left: 0,
              right: 0,
              height: '92dvh',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }
            : {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '94%',
              maxWidth: '1200px',
              height: '88vh',
              borderRadius: '16px',
              animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }),
          background: '#FAF9F5',
          zIndex: 90,
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: isMobile ? '10px 14px' : '14px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: '#FAF9F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 600, fontSize: isMobile ? '13px' : '15px', color: '#1a1a2e', fontFamily: 'Outfit, sans-serif' }}>
              Coding
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.06)',
              background: 'transparent',
              fontSize: '16px',
              color: '#6a6a8a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              touchAction: 'manipulation',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#6a6a8a'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              display: isMobile ? 'flex' : 'grid',
              flexDirection: isMobile ? 'column' : undefined,
              gridTemplateColumns: isMobile ? undefined : '1fr 200px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  padding: isMobile ? '4px 8px' : '6px 12px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '4px' : '8px',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                  background: '#FAF9F5',
                }}
              >
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  style={{
                    padding: isMobile ? '3px 6px' : '4px 10px',
                    borderRadius: '4px',
                    background: '#fff',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: '#1a1a2e',
                    fontSize: isMobile ? '13px' : '12px',
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '90px',
                  }}
                >
                  {languages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <div style={{ flex: 1 }} />
                <button
                  onClick={resetCode}
                  style={{
                    padding: isMobile ? '2px 8px' : '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    background: 'transparent',
                    color: '#6a6a8a',
                    cursor: 'pointer',
                    fontSize: isMobile ? '12px' : '11px',
                    fontFamily: 'Inter, sans-serif',
                    touchAction: 'manipulation',
                  }}
                >
                  Reset
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '26px 1fr' : '30px 1fr',
                  overflow: 'hidden',
                  background: '#0d0d1a',
                  minHeight: isMobile ? '120px' : 'auto',
                }}
              >
                <div
                  style={{
                    padding: isMobile ? '6px 0' : '10px 0',
                    textAlign: 'right',
                    paddingRight: isMobile ? '3px' : '6px',
                    background: 'rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {code.split('\n').map((_: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: isMobile ? '13px' : '11px',
                        lineHeight: '1.6',
                        color: 'rgba(255,255,255,0.12)',
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: isMobile ? '16px' : '11px',
                    lineHeight: '1.6',
                    color: '#a5b4fc',
                    padding: isMobile ? '6px 0 6px 4px' : '10px 0 10px 8px',
                    resize: 'none',
                    width: '100%',
                    height: '100%',
                    caretColor: '#7c3aed',
                    minHeight: isMobile ? '100px' : 'auto',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                  flexShrink: 0,
                  background: '#FAF9F5',
                  minHeight: isMobile ? '50px' : '70px',
                  maxHeight: isMobile ? '70px' : '90px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: isMobile ? '11px' : '10px', fontWeight: 600, color: '#8a8aa8' }}>Tests</span>
                  {ran && <span style={{ fontSize: isMobile ? '11px' : '10px', color: '#10b981' }}>✓ 2/4</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {testCases.map((tc, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: isMobile ? '11px' : '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: ran && tc.status === 'passed' ? '#10b981' : '#6a6a8a',
                      }}
                    >
                      <span>{ran && tc.status === 'passed' ? '✓' : '○'}</span>
                      <span>{tc.input}</span>
                      <span>→ {tc.expected}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {!isMobile && (
              <div
                style={{
                  borderLeft: '1px solid rgba(0,0,0,0.06)',
                  padding: '12px',
                  background: '#FAF9F5',
                  overflowY: 'auto',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#8a8aa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    VIVA Coach
                  </div>
                  <div style={{ fontSize: '11px', color: '#3a3a5a', lineHeight: 1.5 }}>
                    <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(124,58,237,0.04)', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: '#7c3aed' }}>💡</span> Sliding window approach
                    </div>
                    <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(124,58,237,0.04)' }}>
                      <span style={{ fontWeight: 600, color: '#7c3aed' }}>⏱</span> O(n) time, O(min(m,n))
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: isMobile ? '6px 10px' : '8px 16px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              gap: isMobile ? '4px' : '8px',
              justifyContent: 'flex-end',
              flexShrink: 0,
              background: '#FAF9F5',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: isMobile ? '6px 12px' : '8px 18px',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#1a1a2e',
                cursor: 'pointer',
                fontSize: isMobile ? '14px' : '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                touchAction: 'manipulation',
              }}
            >
              Back
            </button>
            <button
              onClick={() => setRan(true)}
              style={{
                padding: isMobile ? '6px 12px' : '8px 18px',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#1a1a2e',
                cursor: 'pointer',
                fontSize: isMobile ? '14px' : '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                touchAction: 'manipulation',
              }}
            >
              ▶ Run
            </button>
            <button
              onClick={() => onSubmit({ code, language: lang })}
              style={{
                padding: isMobile ? '6px 16px' : '8px 24px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: isMobile ? '14px' : '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                touchAction: 'manipulation',
              }}
            >
              Submit →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// SQL WORKSPACE
function SQLWorkspace({
  question,
  isMobile,
  onSubmit,
  onClose,
}: {
  question: Question
  isMobile: boolean
  onSubmit: (submission: any) => void
  onClose: () => void
}) {
  const initialSql = question?.problem?.starterCode?.sql || `-- Write your SQL query below:
SELECT
  d.name AS department,
  ROUND(AVG(e.salary), 2) AS avg_salary,
  COUNT(e.id) AS headcount
FROM employees e
JOIN departments d ON e.department_id = d.id
GROUP BY d.id, d.name
HAVING COUNT(e.id) > 5
ORDER BY avg_salary DESC;`
  const [query, setQuery] = useState(initialSql)
  const [ran, setRan] = useState(false)

  const schema = Array.isArray(question?.problem?.dbSchema)
    ? question.problem.dbSchema.map((table: any) => ({
      name: table.tableName || table.name || 'Table',
      cols: Array.isArray(table.columns) ? table.columns : [],
      rows: table.sampleRows || [],
    }))
    : []

  const results = [
    { department: 'Engineering', avg_salary: '142,500', headcount: 48 },
    { department: 'Product', avg_salary: '128,300', headcount: 22 },
    { department: 'Design', avg_salary: '118,700', headcount: 15 },
  ]

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 80,
          animation: 'fadeIn 0.25s ease',
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          ...(isMobile
            ? {
              bottom: 0,
              left: 0,
              right: 0,
              height: '92dvh',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }
            : {
              bottom: 0,
              left: 0,
              right: 0,
              height: '78vh',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }),
          background: '#FAF9F5',
          zIndex: 90,
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: isMobile ? '10px 14px' : '14px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: '#FAF9F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '10px',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              SQL
            </div>
            <span style={{ fontWeight: 600, fontSize: isMobile ? '13px' : '15px', color: '#1a1a2e', fontFamily: 'Outfit, sans-serif' }}>
              SQL Workspace
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.06)',
              background: 'transparent',
              fontSize: '16px',
              color: '#6a6a8a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              flex: 1,
              display: isMobile ? 'flex' : 'grid',
              flexDirection: isMobile ? 'column' : undefined,
              gridTemplateColumns: isMobile ? undefined : '180px 1fr',
              overflow: 'hidden',
            }}
          >
            {!isMobile && (
              <div
                style={{
                  borderRight: '1px solid rgba(0,0,0,0.06)',
                  padding: '12px',
                  background: '#FAF9F5',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#8a8aa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Schema
                </div>
                {schema.map((tbl: any) => (
                  <div key={tbl.name} style={{ marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '10px', color: '#1a1a2e', marginBottom: '2px' }}>
                      📊 {tbl.name}
                    </div>
                    {tbl.cols.map((col: any) => (
                      <div key={col} style={{ fontSize: '9px', color: '#6a6a8a', paddingLeft: '8px', lineHeight: 1.5 }}>
                        {col}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '26px 1fr' : '30px 1fr',
                  overflow: 'hidden',
                  background: '#0d0d1a',
                }}
              >
                <div
                  style={{
                    padding: '10px 0',
                    textAlign: 'right',
                    paddingRight: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {query.split('\n').map((_: any, i: number) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="-- Write your SQL query here..."
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1.6,
                    resize: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  padding: '6px 12px',
                  background: '#FAF9F5',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a8aa8', marginBottom: '4px' }}>
                  Query Output {ran && <span style={{ color: '#10b981' }}>✓ 4 rows returned</span>}
                </div>
                {ran && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.04)', textAlign: 'left' }}>
                        <th style={{ padding: '3px 6px' }}>Department</th>
                        <th style={{ padding: '3px 6px' }}>Avg Salary</th>
                        <th style={{ padding: '3px 6px' }}>Headcount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '3px 6px' }}>{r.department}</td>
                          <td style={{ padding: '3px 6px' }}>${r.avg_salary}</td>
                          <td style={{ padding: '3px 6px' }}>{r.headcount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              background: '#FAF9F5',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#1a1a2e',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Back
            </button>
            <button
              onClick={() => setRan(true)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#fff',
                color: '#1a1a2e',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ▶ Run Query
            </button>
            <button
              onClick={() => onSubmit({ query })}
              style={{
                padding: '6px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Submit Query ➔
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
