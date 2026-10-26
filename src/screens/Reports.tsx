import { useEffect, useMemo, useState } from 'react'
import type { Screen } from '../types'
import { api } from '../api/api'

interface Props { onNavigate: (screen: Screen) => void }

type Answer = {
  _id?: string
  questionNumber: number
  section: string
  questionType?: string
  question: string
  questionPayload?: any
  answer?: string
  transcript?: string
  codingSubmission?: any
  followUp?: boolean
  followUpReason?: string
  evaluation?: any
  score?: number
  answeredAt?: string
}

type Interview = {
  _id: string
  userId: string
  setup: any
  status: string
  startedAt?: string
  completedAt?: string
  durationSeconds?: number
  answers: Answer[]
  summary?: any
  finalScore?: number
  questionCount?: number
  createdAt?: string
}

function score10to100(score: number) { return Math.round(Math.max(0, Math.min(10, score)) * 10) }

function ScoreBadge({ score }: { score: number }) {
  const background = score >= 80 ? '#EAF7F0' : score >= 60 ? '#FFF5E5' : '#FCEEEE'
  const color = score >= 80 ? '#16834D' : score >= 60 ? '#A66A00' : '#B54747'
  return <span style={{ padding: '5px 9px', borderRadius: 7, background, color, fontWeight: 800, fontSize: 12 }}>{score}</span>
}

function formatDuration(seconds = 0) {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}m ${sec}s`
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function InterviewCard({ interview, onOpen }: { interview: Interview; onOpen: (x: Interview) => void }) {
  const score = Number(interview.finalScore || interview.summary?.averageScore || 0)
  const setup = interview.setup || {}
  return (
    <article style={{ background: '#fff', border: '1px solid rgba(23,32,51,.09)', borderRadius: 14, padding: 18, boxShadow: '0 4px 18px rgba(23,32,51,.045)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ color: '#3358E8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{setup.domain || 'Interview'}</div>
          <h3 style={{ margin: '6px 0 3px', fontFamily: 'Outfit', fontSize: 18 }}>{setup.role || 'Candidate Interview'}</h3>
          <div style={{ color: '#667085', fontSize: 12 }}>{setup.subDomain} · {setup.objective}</div>
        </div>
        <ScoreBadge score={score10to100(score)} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
        {(setup.types || []).map((x: string) => <span key={x} style={{ padding: '5px 8px', borderRadius: 999, background: '#F1F4FF', color: '#3358E8', fontSize: 11, fontWeight: 700 }}>{x}</span>)}
        {setup.useResume && <span style={{ padding: '5px 8px', borderRadius: 999, background: '#EEF8F2', color: '#16834D', fontSize: 11, fontWeight: 700 }}>Resume used</span>}
      </div>
      <div style={{ marginTop: 15, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        <Metric label="Questions" value={String(interview.answers?.length || 0)} />
        <Metric label="Duration" value={formatDuration(interview.durationSeconds)} />
        <Metric label="Completed" value={formatDate(interview.completedAt)} />
      </div>
      <p style={{ color: '#667085', fontSize: 12, lineHeight: 1.5, margin: '14px 0' }}>{interview.summary?.lastSummary || 'Interview report is available with question-by-question evaluations.'}</p>
      <button onClick={() => onOpen(interview)} style={{ width: '100%', border: 0, borderRadius: 9, padding: '11px 14px', background: '#3358E8', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>View Full Report</button>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ background: '#F8FAFF', borderRadius: 8, padding: 9 }}><div style={{ fontSize: 10, color: '#7B8497' }}>{label}</div><div style={{ marginTop: 3, fontWeight: 800, fontSize: 12, color: '#172033' }}>{value}</div></div>
}

export default function Reports({ onNavigate }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [selected, setSelected] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.listInterviews()
      .then(data => { if (active) setInterviews(Array.isArray(data?.interviews) ? data.interviews : []) })
      .catch(e => { if (active) setError(e?.message || 'Could not load reports.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const average = useMemo(() => {
    if (!interviews.length) return 0
    return Math.round(interviews.reduce((sum, x) => sum + score10to100(Number(x.finalScore || x.summary?.averageScore || 0)), 0) / interviews.length)
  }, [interviews])

  return (
    <div style={{ minHeight: '100%', background: '#FAF9F5', padding: '28px 24px 60px', color: '#172033' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div><div style={{ color: '#3358E8', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' }}>INTERVIEW HISTORY</div><h1 style={{ margin: '7px 0', fontFamily: 'Outfit', fontSize: 30 }}>My Reports</h1><p style={{ margin: 0, color: '#667085', fontSize: 14 }}>Every question, answer, evaluation and score is loaded from MongoDB.</p></div>
          <button onClick={() => onNavigate('interview-setup')} style={{ border: 0, borderRadius: 9, background: '#3358E8', color: '#fff', padding: '11px 16px', fontWeight: 800 }}>+ New Interview</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 25 }}>
          <Metric label="Completed interviews" value={String(interviews.length)} />
          <Metric label="Average score" value={`${average}/100`} />
          <Metric label="Stored interview answers" value={String(interviews.reduce((n, x) => n + (x.answers?.length || 0), 0))} />
        </div>

        {loading && <div style={{ background: '#fff', borderRadius: 12, padding: 25 }}>Loading reports…</div>}
        {error && <div style={{ background: '#FFF0F0', color: '#B42318', borderRadius: 10, padding: 14 }}>{error}</div>}
        {!loading && !error && interviews.length === 0 && <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 14, padding: 35, textAlign: 'center' }}>No completed interviews yet. Start an interview to generate your first report.</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 18 }}>
          {interviews.map(item => <InterviewCard key={item._id} interview={item} onOpen={setSelected} />)}
        </div>
      </div>

      {selected && <ReportModal interview={selected} onClose={() => setSelected(null)} />}
      <style>{`@media(max-width:900px){.reports-grid{grid-template-columns:1fr 1fr!important}} @media(max-width:650px){.reports-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}

function ReportModal({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const setup = interview.setup || {}
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(23,32,51,.72)', padding: 15, overflow: 'auto' }}>
    <div onClick={e => e.stopPropagation()} style={{ width: 'min(1000px,100%)', margin: '20px auto', background: '#fff', borderRadius: 15, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div><div style={{ color: '#3358E8', fontSize: 11, fontWeight: 800 }}>{setup.domain} · {setup.subDomain}</div><h2 style={{ margin: '5px 0' }}>{setup.role}</h2><div style={{ color: '#667085', fontSize: 12 }}>{setup.objective} · {(setup.types || []).join(', ')}</div></div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #D9DEE8', background: '#FAF9F5' }}>×</button>
      </div>

      <div style={{ background: '#F8FAFF', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <strong>Complete setup</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 10, fontSize: 12 }}>
          <div>Stage: <b>{setup.stage || '—'}</b></div><div>Difficulty: <b>{setup.difficulty || '—'}</b></div>
          <div>Duration: <b>{setup.duration || '—'} min</b></div><div>Language: <b>{setup.language || '—'}</b></div>
          <div>Company: <b>{setup.company || '—'}</b></div><div>Resume used: <b>{setup.useResume ? 'Yes' : 'No'}</b></div>
          <div>Coding: <b>{setup.requiresCoding ? 'Yes' : 'No'}</b></div><div>SQL: <b>{setup.requiresSql ? 'Yes' : 'No'}</b></div>
          <div style={{ gridColumn: '1/-1' }}>Custom topics: <b>{Array.isArray(setup.customTopics) ? setup.customTopics.join(', ') : setup.customTopics || '—'}</b></div>
        </div>
      </div>

      <h3 style={{ margin: '0 0 12px' }}>Question-by-question evaluation</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {(interview.answers || []).map((a, i) => <AnswerCard key={a._id || i} answer={a} />)}
      </div>
    </div>
  </div>
}

function AnswerCard({ answer }: { answer: Answer }) {
  const score = Number(answer.score || answer.evaluation?.score || 0)
  return <article style={{ border: '1px solid #E4E7EC', borderRadius: 11, padding: 15 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div style={{ fontSize: 11, color: '#3358E8', fontWeight: 800 }}>Q{answer.questionNumber} · {answer.section}</div><ScoreBadge score={score10to100(score)} /></div>
    <div style={{ marginTop: 8, fontWeight: 750, lineHeight: 1.45 }}>{answer.question}</div>
    <div style={{ marginTop: 10, padding: 11, background: '#F8FAFF', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}><strong>Answer:</strong>{' '}{answer.answer || answer.transcript || 'No answer text'}</div>
    {answer.codingSubmission && <pre style={{ overflow: 'auto', background: '#111827', color: '#E5E7EB', padding: 11, borderRadius: 8, fontSize: 11 }}>{JSON.stringify(answer.codingSubmission, null, 2)}</pre>}
    <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55, color: '#475467' }}>
      {answer.evaluation?.correctness && <div><b>Correctness:</b> {answer.evaluation.correctness}</div>}
      {answer.evaluation?.technicalDepth && <div><b>Depth:</b> {answer.evaluation.technicalDepth}</div>}
      {answer.evaluation?.clarity && <div><b>Clarity:</b> {answer.evaluation.clarity}</div>}
      {answer.evaluation?.relevance && <div><b>Relevance:</b> {answer.evaluation.relevance}</div>}
      {answer.evaluation?.strengths?.length > 0 && <div><b>Strengths:</b> {answer.evaluation.strengths.join(' · ')}</div>}
      {answer.evaluation?.missingPoints?.length > 0 && <div><b>Missing:</b> {answer.evaluation.missingPoints.join(' · ')}</div>}
      {answer.followUp && <div style={{ marginTop: 7, color: '#A66A00' }}><b>Cross-question:</b> {answer.followUpReason || 'The AI probed the weakness in the previous answer.'}</div>}
    </div>
  </article>
}
