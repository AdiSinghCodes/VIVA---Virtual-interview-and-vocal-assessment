import { useEffect, useMemo, useState } from 'react'
import type { Screen } from '../types'
import { useAuth } from '../context/AuthContext'
import { api } from "../api/api"

type Domain = { name: string; subs: string[]; roles: string[] }

const DOMAINS: Domain[] = [
  { name: 'Technology & Software', subs: ['Software Development','Frontend Development','Backend Development','Full Stack Development','Mobile Development','DevOps & SRE','Cloud Computing','Cybersecurity','QA & Testing','Database Engineering','Embedded Systems','IT Support','Solutions Architecture','Game Development','Blockchain & Web3'], roles: ['Software Engineer','Frontend Engineer','Backend Engineer','Full Stack Developer','React Developer','Node.js Developer','Java Developer','Python Developer','.NET Developer','Mobile Developer','DevOps Engineer','Cloud Engineer','SRE','Cybersecurity Engineer','QA Engineer','Automation Test Engineer','Database Engineer','Solutions Architect','Engineering Manager'] },
  { name: 'Data, AI & Machine Learning', subs: ['Data Science','Machine Learning','Artificial Intelligence','Generative AI & LLM','NLP','Computer Vision','Data Engineering','Analytics','Business Intelligence'], roles: ['Data Analyst','Data Scientist','ML Engineer','AI Engineer','GenAI Engineer','NLP Engineer','Computer Vision Engineer','Data Engineer','BI Analyst','Research Scientist'] },
  { name: 'Finance & Banking', subs: ['Investment Banking','Equity Research','Corporate Finance','Accounting','Audit','Risk','Banking','Insurance'], roles: ['Financial Analyst','Investment Banking Analyst','Equity Research Analyst','Accountant','Auditor','Risk Analyst','Credit Analyst','Finance Manager','Banking Officer'] },
  { name: 'Business & Management', subs: ['Product Management','Project Management','Program Management','Strategy','Operations','Business Analysis','Consulting'], roles: ['Product Manager','Associate Product Manager','Project Manager','Program Manager','Business Analyst','Strategy Analyst','Operations Manager','Management Consultant'] },
  { name: 'Sales & Marketing', subs: ['Sales','Business Development','Digital Marketing','SEO','Growth','Brand','Content','Social Media'], roles: ['Sales Executive','Business Development Executive','Sales Manager','Account Manager','Digital Marketing Specialist','SEO Specialist','Growth Manager','Brand Manager','Content Strategist'] },
  { name: 'Human Resources', subs: ['Recruitment','Talent Acquisition','HR Operations','HR Business Partner','Learning & Development','Compensation'], roles: ['HR Executive','Recruiter','Talent Acquisition Specialist','HR Business Partner','HR Manager','L&D Specialist'] },
  { name: 'Design & Creative', subs: ['UI Design','UX Design','Product Design','Graphic Design','UX Research','Motion Design'], roles: ['UI Designer','UX Designer','Product Designer','UX Researcher','Graphic Designer','Motion Designer'] },
  { name: 'Legal', subs: ['Corporate Law','Litigation','Compliance','Intellectual Property','Contract Law'], roles: ['Legal Associate','Corporate Lawyer','Compliance Analyst','Legal Counsel','Contract Specialist'] },
  { name: 'Healthcare & Medical', subs: ['Medicine','Nursing','Pharmacy','Healthcare Administration','Public Health'], roles: ['Doctor','Nurse','Pharmacist','Healthcare Administrator','Public Health Professional'] },
  { name: 'Education & Research', subs: ['Teaching','Higher Education','Research','Academic Administration'], roles: ['Teacher','Lecturer','Professor','Research Assistant','Research Scientist','Academic Coordinator'] },
  { name: 'Civil Services & Government', subs: ['UPSC Civil Services','State PSC','SSC','Banking Exams','Regulatory Exams','Railways','Defence','PSU','Teaching & Eligibility Exams'], roles: ['UPSC CSE Personality Test','IAS','IPS','IFS','IRS','MPSC','SSC CGL','SSC CHSL','RBI Grade B','SEBI Grade A','NABARD','IBPS PO','SBI PO','Railway Recruitment','CDS','AFCAT','CAPF','PSU Recruitment','UGC NET'] },
  { name: 'Engineering', subs: ['Mechanical','Civil','Electrical','Electronics','Chemical','Automotive','Aerospace'], roles: ['Mechanical Engineer','Civil Project Engineer','Electrical Engineer','Electronics Engineer','Chemical Engineer','Automotive Engineer','Aerospace Engineer'] },
  { name: 'Architecture & Construction', subs: ['Architecture','Planning','Construction','Quantity Surveying'], roles: ['Architect','Civil Project Engineer','Site Engineer','Quantity Surveyor','Urban Planner'] },
  { name: 'Media & Communications', subs: ['Journalism','Public Relations','Corporate Communications','Content'], roles: ['Journalist','Content Writer','PR Executive','Communications Manager','Editor'] },
  { name: 'Hospitality & Tourism', subs: ['Hotel Management','Travel','Food & Beverage','Events'], roles: ['Hotel Manager','Travel Consultant','Event Manager','F&B Manager'] },
  { name: 'Science', subs: ['Physics','Chemistry','Biology','Mathematics','Environmental Science'], roles: ['Research Scientist','Lab Analyst','Scientific Officer','Research Assistant'] },
  { name: 'Custom / Other', subs: ['Custom Domain'], roles: ['Custom Role'] },
]

const INTERVIEW_TYPES = [
  'Technical','Coding / DSA','SQL / Database','System Design','Behavioral','HR',
  'Managerial','Leadership','Case Study','Situational','Domain Knowledge',
  'Resume Based','Project Based','Communication','Aptitude','General Knowledge',
  'Current Affairs','Personality / Viva','Full Interview'
]

const OBJECTIVES = [
  'Job Interview','Campus Placement','Internship Interview','Mock Interview',
  'Promotion Interview','Internal Transfer','UPSC Personality Test',
  'Government Exam Interview','College Admission','Scholarship Interview',
  'Research Interview','Visa Interview','Leadership Interview','Custom Interview'
]

const EXPERIENCE_STAGES = [
  { id: 'intern', label: 'Intern', description: 'Internship / student' },
  { id: 'entry', label: 'Entry / Fresher', description: '0–2 years' },
  { id: 'mid', label: 'Mid-level', description: '2–5 years' },
  { id: 'senior', label: 'Senior', description: '5+ years' },
]

const safe = (value: unknown) => String(value ?? '').trim()

function normalizeDifficulty(value: unknown) {
  const v = safe(value).toLowerCase()
  if (v === 'beginner') return 'beginner'
  if (v === 'advanced') return 'advanced'
  if (v === 'senior expert' || v === 'expert' || v === 'senior') return 'senior expert'
  return 'medium'
}

function inferStage(profile: any) {
  const years = Number.parseFloat(safe(profile?.yearsExperience))
  if (Number.isFinite(years)) {
    if (years <= 0) return 'entry'
    if (years <= 2) return 'entry'
    if (years <= 5) return 'mid'
    return 'senior'
  }

  const level = safe(profile?.experienceLevel).toLowerCase()
  if (level.includes('student') || level.includes('fresher') || level.includes('entry')) return 'entry'
  if (level.includes('senior')) return 'senior'
  if (level.includes('mid')) return 'mid'
  return 'entry'
}

function splitList(value: unknown) {
  return safe(value)
    .split(/[,;\n|]+/)
    .map(x => x.trim())
    .filter(Boolean)
}

export default function InterviewSetup({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { user } = useAuth()

  const [domain, setDomain] = useState(DOMAINS[0].name)
  const d = useMemo(() => DOMAINS.find(x => x.name === domain) || DOMAINS[0], [domain])

  const [sub, setSub] = useState(d.subs[0])
  const [role, setRole] = useState(d.roles[0])
  const [objective, setObjective] = useState('Job Interview')
  const [types, setTypes] = useState<string[]>(['Domain Knowledge'])
  const [stage, setStage] = useState('entry')
  const [companyType, setCompanyType] = useState('product')
  const [company, setCompany] = useState('')
  const [duration, setDuration] = useState(45)
  const [difficulty, setDifficulty] = useState('medium')
  const [language, setLanguage] = useState('English')
  const [useResume, setUseResume] = useState(true)
  const [customTopics, setCustomTopics] = useState('')
  const [codingLanguage, setCodingLanguage] = useState('python')
  const [loading, setLoading] = useState(false)
  const [autofilling, setAutofilling] = useState(true)
  const [error, setError] = useState('')

  /*
   * IMPORTANT:
   * This effect runs whenever the Interview Setup screen receives/updates the
   * authenticated user. It uses the saved profile AND the stored resume text.
   * Resume-derived profile fields should already have been persisted by the
   * Profile/Resume flow, so every visit gets the latest saved values.
   */
  useEffect(() => {
    if (!user?.profile) {
      setAutofilling(false)
      return
    }

    const p: any = user.profile
    const resume: any = p.resume || {}
    const resumeText = safe(resume.text)

    // Profile fields take priority; resume text is retained as interview context.
    // If your resume analyzer returns fields under p.resume.analysis/profile,
    // these are used as fallbacks without overwriting manually saved profile data.
    const extracted = resume.analysis?.profile || resume.extractedProfile || {}

    const targetRole = safe(p.targetRole) || safe(extracted.targetRole) || safe(extracted.role)
    const targetRoleLower = targetRole.toLowerCase()

    const match =
      DOMAINS.find(x => x.roles.some(r => r.toLowerCase() === targetRoleLower)) ||
      DOMAINS.find(x => x.name.toLowerCase() === targetRoleLower)

    if (match) {
      setDomain(match.name)
      const roleMatch = match.roles.find(r => r.toLowerCase() === targetRoleLower)
      setSub(safe(p.subDomain) || match.subs[0])
      setRole(roleMatch || targetRole || match.roles[0])
    } else if (targetRole) {
      setRole(targetRole)
    }

    const profileStage = inferStage(p)
    setStage(profileStage)

    if (p.difficulty || extracted.difficulty) {
      setDifficulty(normalizeDifficulty(p.difficulty || extracted.difficulty))
    }

    if (safe(p.language) || safe(extracted.language)) {
      setLanguage(safe(p.language) || safe(extracted.language))
    }


    if (safe(p.companyName) || safe(extracted.companyName)) {
      setCompany(safe(p.companyName) || safe(extracted.companyName))
    }

    if (safe(p.companyType) || safe(extracted.companyType)) {
      setCompanyType(safe(p.companyType) || safe(extracted.companyType))
    }

    // Resume text is automatically enabled when a stored resume exists.
    setUseResume(Boolean(resumeText || resume.fileName || resume.fileUrl))


    setAutofilling(false)
    // Intentionally depend on user so returning to this page always gets latest data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const changeDomain = (value: string) => {
    const nd = DOMAINS.find(x => x.name === value) || DOMAINS[0]
    setDomain(nd.name)
    setSub(nd.subs[0])
    setRole(nd.roles[0])

    // A new domain starts with domain-focused questions. Technical coding/SQL
    // must be explicitly selected in Interview Focus; profile preferences never override it.
    if (nd.name !== 'Technology & Software' && nd.name !== 'Data, AI & Machine Learning') {
      setTypes(current => current.filter(x => !/technical|coding|dsa|sql|system design/i.test(x)).length
        ? current.filter(x => !/technical|coding|dsa|sql|system design/i.test(x))
        : ['Domain Knowledge'])
    }
  }

  const toggle = (type: string) => {
    setTypes(current =>
      current.includes(type)
        ? current.filter(x => x !== type)
        : [...current, type]
    )
  }

  const resume = user?.profile?.resume
  const resumeText = safe(resume?.text)
  const hasResume = Boolean(resumeText || resume?.fileName || resume?.fileUrl)
  const isTechnical = types.some(x => x.trim().toLowerCase() === 'technical')
  const plannedQuestions = Math.max(6, Math.round(duration / 3))

  const start = async () => {
    if (!user) return

    if (!user.profile) {
      setError('Please complete your profile before starting an interview.')
      onNavigate('profile')
      return
    }

    setLoading(true)
    setError('')

    try {
      const profile: any = user.profile
      const interviewResume = useResume
        ? {
            ...profile,
            text: resumeText,
            fileName: resume?.fileName || '',
            fileUrl: resume?.fileUrl || '',
          }
        : null

      // This object is the single source of truth for the interview.
      // Every visible setup field is sent using canonical names AND compatibility aliases.
      const finalSetup = {
        userId: user.id,
        domain,
        primary_domain: domain,
        subDomain: sub,
        sub_domain: sub,
        role,
        specific_role: role,
        objective,
        interviewType: types.join(', '),
        types: [...types],
        interview_types: [...types],
        stage,
        companyType,
        company_type: companyType,
        company,
        company_name: company,
        duration,
        duration_min: duration,
        questionCount: plannedQuestions,
        question_count: plannedQuestions,
        plannedQuestions,
        difficulty,
        language,
        useResume,
        use_resume: useResume,
        customTopics,
        custom_topics: customTopics,
        codingLanguage,
        coding_language: codingLanguage,
        isTechnical,
        is_technical: isTechnical,
        requiresCoding: isTechnical,
        requires_coding: isTechnical,
        requiresSql: isTechnical,
        requires_sql: isTechnical,
        techStack: splitList(profile.skills),
        tech_stack: splitList(profile.skills),
        profile: {
          ...profile,
          // Resume text is deliberately absent when the toggle is OFF.
          resume: useResume ? interviewResume : null,
        },
        resume: interviewResume,
      }

      console.log('========================================')
      console.log('🚀 COMPLETE INTERVIEW SETUP')
      console.log(JSON.stringify(finalSetup, null, 2))
      console.log('========================================')

      // Persist the exact setup locally so InterviewRoom cannot fall back to stale profile data.
      sessionStorage.setItem('viva_interview_setup', JSON.stringify(finalSetup))
      localStorage.setItem('viva_interview_setup', JSON.stringify(finalSetup))
      localStorage.removeItem('viva_interview_session')

      onNavigate('interview-room')
    } catch (e: any) {
      setError(e?.message || 'Unable to prepare the interview.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100%',
      background: '#FAF9F5',
      padding: '28px 24px 60px',
      color: '#172033'
    }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#3358E8',
            letterSpacing: '.08em'
          }}>
            VIVA · INTERVIEW BUILDER
          </div>

          <h1 style={{
            fontFamily: 'Outfit',
            fontSize: 32,
            margin: '7px 0'
          }}>
            Build your interview
          </h1>

          <p style={{ color: '#667085' }}>
            Your profile and resume are automatically used to prefill this setup.
            You can change any field before starting.
          </p>
        </div>

        {autofilling && (
          <div style={{
            padding: 12,
            borderRadius: 10,
            background: '#F1F4FF',
            color: '#3358E8',
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 700
          }}>
            Autofilling interview details from your profile and resume…
          </div>
        )}

        {/* RESUME CONTEXT */}
        <Section title="1. Resume & candidate context">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: 15,
            border: '1px solid #DDE3F5',
            borderRadius: 10,
            background: '#F8FAFF',
            marginBottom: 15
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>
                {resume?.fileName || (hasResume ? 'Resume available' : 'No resume uploaded')}
              </div>

              <div style={{
                fontSize: 12,
                color: '#667085',
                marginTop: 4
              }}>
                {hasResume
                  ? 'Your saved resume will be passed to the AI interviewer.'
                  : 'Upload a resume from your Profile screen to enable resume-based questions.'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUseResume(value => !value)}
              disabled={!hasResume}
              style={{
                border: 0,
                borderRadius: 20,
                padding: '8px 14px',
                background: useResume && hasResume ? '#3358E8' : '#D0D5DD',
                color: '#fff',
                fontWeight: 700,
                cursor: hasResume ? 'pointer' : 'not-allowed',
                flexShrink: 0
              }}
            >
              {useResume && hasResume ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="viva-two">
            <div>
              <Label>Candidate name</Label>
              <input
                value={safe(user?.profile?.fullName) || `${safe((user as any)?.firstName)} ${safe((user as any)?.lastName)}`.trim()}
                readOnly
              />
            </div>

            <div>
              <Label>Current role</Label>
              <input
                value={safe(user?.profile?.currentRole)}
                placeholder="Autofilled from profile/resume"
                readOnly
              />
            </div>
          </div>

          <div className="viva-two">
            <div>
              <Label>Location</Label>
              <input
                value={safe(user?.profile?.location)}
                placeholder="Autofilled from profile/resume"
                readOnly
              />
            </div>

            <div>
              <Label>Experience</Label>
              <input
                value={safe(user?.profile?.yearsExperience) || safe(user?.profile?.experienceLevel)}
                placeholder="Autofilled from profile/resume"
                readOnly
              />
            </div>
          </div>
        </Section>

        {/* DOMAIN */}
        <Section title="2. What are you preparing for?">
          <Label>Primary domain</Label>
          <select value={domain} onChange={e => changeDomain(e.target.value)}>
            {DOMAINS.map(item => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>

          <div className="viva-two">
            <div>
              <Label>Sub-primary domain</Label>
              <select value={sub} onChange={e => setSub(e.target.value)}>
                {d.subs.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Specific role / exam</Label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                {d.roles.map(item => (
                  <option key={item}>{item}</option>
                ))}
                {!d.roles.includes(role) && role && <option value={role}>{role}</option>}
              </select>
            </div>
          </div>

          <Label>Interview objective</Label>
          <select value={objective} onChange={e => setObjective(e.target.value)}>
            {OBJECTIVES.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Section>

        {/* EXPERIENCE + LANGUAGE */}
        <Section title="3. Candidate level & language">
          <div className="viva-two">
            <div>
              <Label>Experience stage</Label>
              <select value={stage} onChange={e => setStage(e.target.value)}>
                {EXPERIENCE_STAGES.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Language</Label>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
                <option>English + Hindi</option>
              </select>
            </div>
          </div>

          <div className="autofill-note">
            ✓ Values above are loaded automatically from your saved profile/resume when available.
          </div>
        </Section>

        {/* TYPES */}
        <Section title="4. Interview focus">
          <p style={{ fontSize: 12, color: '#667085', marginTop: -4 }}>
            Select one or multiple formats. Your saved interview preference is selected automatically.
          </p>

          <div className="viva-chips">
            {INTERVIEW_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggle(type)}
                className={types.includes(type) ? 'sel' : ''}
              >
                {type}
              </button>
            ))}
          </div>
        </Section>

        {/* COMPANY */}
        <Section title="5. Corporate / exam details">
          <div className="viva-two">
            <div>
              <Label>Company / institution</Label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google, Microsoft, UPSC, MPSC..."
              />
            </div>

            <div>
              <Label>Company type</Label>
              <select value={companyType} onChange={e => setCompanyType(e.target.value)}>
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="startup">Startup</option>
                <option value="mnc">MNC</option>
                <option value="government">Government</option>
                <option value="college">College / University</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Label>Custom topics / syllabus</Label>
          <textarea
            value={customTopics}
            onChange={e => setCustomTopics(e.target.value)}
            placeholder="Skills from your profile are prefilled here. Add or remove topics as needed."
            rows={4}
          />
        </Section>

        {/* SESSION */}
        <Section title="6. Session settings">
          <div className="viva-three">
            <div>
              <Label>Difficulty</Label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="medium">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="senior expert">Senior Expert</option>
              </select>
            </div>

            <div>
              <Label>Duration</Label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>

            <div>
              <Label>Planned questions</Label>
              <div className="readonly-field">
                {plannedQuestions} questions
              </div>
            </div>
          </div>

          <div className="session-note">
            Question count is calculated from duration. Technical interviews target approximately
            60% verbal and 40% technical-solving coverage.
          </div>

          {isTechnical && (
            <div style={{ marginTop: 12 }}>
              <Label>Workspace language</Label>
              <select
                value={codingLanguage}
                onChange={e => setCodingLanguage(e.target.value)}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="sql">SQL</option>
              </select>

              <div className="session-note">
                Technical interviews can include LLM-generated coding and SQL tasks.
              </div>
            </div>
          )}
        </Section>

        {error && (
          <div style={{
            padding: 12,
            borderRadius: 9,
            background: '#FFF0F0',
            color: '#B42318',
            marginBottom: 14
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10
        }}>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="secondary-button"
          >
            Edit Profile
          </button>

          <button
            disabled={loading || autofilling || types.length === 0}
            onClick={start}
            className="start-button"
          >
            {loading ? 'Preparing AI interview…' : 'Start Interview →'}
          </button>
        </div>
      </div>

      <style>{`
        .viva-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .viva-three {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }

        .viva-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .viva-chips button {
          padding: 9px 12px;
          border-radius: 20px;
          border: 1px solid #D9DEE8;
          background: #FFF;
          color: #475467;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
        }

        .viva-chips button.sel {
          background: #3358E8;
          color: #FFF;
          border-color: #3358E8;
        }

        .interview-form-section {
          background: #FFF;
          border: 1px solid #E4E7EC;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 14px;
          box-shadow: 0 3px 12px rgba(16,24,40,.03);
        }

        .viva-label {
          font-size: 12px;
          font-weight: 700;
          color: #344054;
          margin: 0 0 6px;
          display: block;
        }

        select,
        input,
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #D9DEE8;
          border-radius: 9px;
          background: #FFF;
          color: #172033;
          font: inherit;
          margin-bottom: 13px;
        }

        input[readonly] {
          background: #F8FAFF;
          color: #475467;
        }

        .readonly-field {
          padding: 11px 12px;
          border: 1px solid #D9DEE8;
          border-radius: 9px;
          background: #F8FAFF;
          font-weight: 800;
          margin-bottom: 13px;
          min-height: 20px;
        }

        .autofill-note {
          padding: 10px 12px;
          border-radius: 8px;
          background: #F1F4FF;
          color: #3358E8;
          font-size: 12px;
          font-weight: 600;
        }

        .session-note {
          font-size: 12px;
          color: #667085;
          line-height: 1.5;
        }

        .secondary-button {
          background: #FFF;
          color: #475467;
          border: 1px solid #D9DEE8;
          border-radius: 10px;
          padding: 13px 18px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .start-button {
          background: #3358E8;
          color: #FFF;
          border: 0;
          border-radius: 10px;
          padding: 13px 22px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        }

        .start-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media(max-width:700px) {
          .viva-two,
          .viva-three {
            grid-template-columns: 1fr;
          }

          .secondary-button,
          .start-button {
            width: 100%;
          }

          .interview-form-section {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  )
}

function Label({ children }: { children: any }) {
  return <label className="viva-label">{children}</label>
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <section className="interview-form-section">
      <h2 style={{
        fontFamily: 'Outfit',
        fontSize: 18,
        margin: '0 0 15px'
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}
