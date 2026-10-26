import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ResumeAnalysis() {
  const { user, uploadResume } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await api.resumeAnalysis();
      setData(r);
      setTargetRole(r.ats?.targetRole || user?.profile?.targetRole || '');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (user?.profile?.resume?.text) void load(); else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const upload = async (file?: File) => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const r = await uploadResume(file);
      setData({ ats: r.ats, resume: r.user.profile.resume });
      setTargetRole(r.ats?.targetRole || r.user.profile?.targetRole || '');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const analyzeForJob = async () => {
    setLoading(true); setError('');
    try {
      const r = await api.analyzeResumeForJob(targetRole, jobDescription);
      setData(r);
    } catch (e: any) { setError(e.message || 'Could not analyze this resume.'); }
    finally { setLoading(false); }
  };

  if (!user) return null;
  const ats = data?.ats;
  return <div style={{ minHeight: '100%', background: '#FAF9F5', padding: '28px 24px 70px', color: '#172033' }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#3358E8', letterSpacing: '.08em' }}>VIVA · RESUME ANALYSIS</div>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 30, margin: '6px 0' }}>AI Resume Screening Estimate</h1>
        <p style={{ color: '#667085', fontSize: 13, lineHeight: 1.6 }}>Get an industry-style, role-specific review of ATS compatibility, likely screening strengths, missing keywords, and truthful resume improvements. A score cannot guarantee a shortlist; employers use different systems and applicant criteria.</p>
      </div>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 15, flexWrap: 'wrap', marginBottom: 18 }}>
          <div><b>{data?.resume?.fileName || user.profile?.resume?.fileName || 'No resume uploaded'}</b><div style={muted}>Upload a new version to recalculate its screening estimate.</div></div>
          <label style={primaryButton}>Upload Resume<input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => void upload(e.target.files?.[0])} /></label>
        </div>
        <label style={fieldLabel}>Target job role</label>
        <input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Java Backend Developer" style={textInput} />
        <label style={{ ...fieldLabel, marginTop: 14 }}>Job description (recommended)</label>
        <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here. The AI will compare your resume with the required skills, responsibilities, and keywords." rows={6} style={{ ...textInput, resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <button onClick={() => void analyzeForJob()} disabled={loading || !(data?.resume?.text || user.profile?.resume?.text)} style={{ ...primaryButton, border: 0, opacity: loading ? .65 : 1, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Analyzing…' : jobDescription.trim() ? 'Analyze against this job' : 'Analyze for this role'}</button>
          <span style={{ fontSize: 11, color: '#667085' }}>A specific job description gives a more relevant comparison than a generic role.</span>
        </div>
      </section>

      {loading && <div style={card}>Analyzing resume structure, semantic relevance, role requirements, and ATS-style screening signals…</div>}
      {error && <div style={{ ...card, color: '#b42318', background: '#fff0f0' }}>{error}</div>}
      {!loading && !data && !error && <div style={card}>Upload your resume to get a role-specific screening estimate.</div>}

      {!loading && ats && <>
        <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 130, height: 130, flex: '0 0 130px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(#3358E8 ${ats.score}%,#e8eaf0 0)` }}><div style={{ width: 102, height: 102, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Outfit', fontSize: 30, fontWeight: 800 }}>{ats.score}<span style={{ fontSize: 10, color: '#667085' }}>/100</span></div></div>
          <div style={{ flex: 1, minWidth: 230 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><h2 style={{ ...h2, marginBottom: 4 }}>Estimated ATS screening fit</h2><span style={pill}>{ats.shortlistBand || 'Heuristic estimate'}</span></div>
            <div style={{ fontSize: 15, fontWeight: 800, margin: '8px 0' }}>Shortlisting outlook: {ats.shortlistChanceRange || 'Not reliably quantifiable'}</div>
            <p style={{ color: '#667085', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>{ats.screeningRationale || ats.note}</p>
            <div style={{ fontSize: 11, color: '#475467' }}>Semantic match: {ats.semanticScore == null ? 'Unavailable' : `${ats.semanticScore}/100`} · Review: {ats.industryReview ? 'AI-assisted + semantic checks' : 'Fallback structural/semantic checks'} · Target: {ats.targetRole || targetRole || 'General role'}</div>
            <p style={{ fontSize: 11, color: '#667085', margin: '8px 0 0' }}>{ats.note}</p>
          </div>
        </section>

        {(ats.strengths?.length > 0 || ats.gaps?.length > 0) && <div style={twoCol}>
          <section style={card}><h2 style={h2}>Strengths detected</h2><ul style={list}>{(ats.strengths || []).map((x: string, i: number) => <li key={`${x}-${i}`}>{x}</li>)}</ul></section>
          <section style={card}><h2 style={h2}>Screening gaps</h2>{ats.gaps?.length ? <ul style={list}>{ats.gaps.map((x: string, i: number) => <li key={`${x}-${i}`}>{x}</li>)}</ul> : <p style={muted}>No AI-reported critical gaps. Review priority actions below as well.</p>}</section>
        </div>}

        <section style={card}><h2 style={h2}>Keywords to include naturally</h2><p style={muted}>Add only keywords that accurately describe skills you can explain in an interview. Do not keyword-stuff.</p>{(ats.keywordsToInclude || []).length ? <div style={chipWrap}>{ats.keywordsToInclude.map((x: string, i: number) => <span key={`${x}-${i}`} style={chip}>{x}</span>)}</div> : <p style={muted}>Run an AI-assisted analysis with a configured LLM to receive tailored keyword suggestions.</p>}</section>

        {ats.summaryParagraph && <section style={card}><h2 style={h2}>Personalized professional summary</h2><p style={{ lineHeight: 1.75, fontSize: 14, color: '#344054' }}>{ats.summaryParagraph}</p><button style={secondaryButton} onClick={() => void navigator.clipboard?.writeText(ats.summaryParagraph)}>Copy summary paragraph</button></section>}

        {ats.bulletRewrites?.length > 0 && <section style={card}><h2 style={h2}>Improve your experience and project bullets</h2><ul style={list}>{ats.bulletRewrites.map((x: string, i: number) => <li key={`${x}-${i}`}>{x}</li>)}</ul></section>}
        {ats.priorityActions?.length > 0 && <section style={card}><h2 style={h2}>Priority improvements</h2><ol style={list}>{ats.priorityActions.map((x: string, i: number) => <li key={`${x}-${i}`}>{x}</li>)}</ol></section>}
        {(ats.jdMatchedKeywords?.length > 0 || ats.jdMissingKeywords?.length > 0) && <section style={card}><h2 style={h2}>Job description keyword match</h2><div style={twoCol}><div><b style={{ color: '#16834D', fontSize: 12 }}>Matched</b><div style={chipWrap}>{ats.jdMatchedKeywords.map((x: string, i: number) => <span key={`${x}-${i}`} style={chip}>{x}</span>)}</div></div><div><b style={{ color: '#B54708', fontSize: 12 }}>Missing / weak evidence</b><div style={chipWrap}>{ats.jdMissingKeywords.map((x: string, i: number) => <span key={`${x}-${i}`} style={{ ...chip, background: '#FFF4E5', color: '#8A4B08' }}>{x}</span>)}</div></div></div></section>}

        <section style={card}><h2 style={h2}>ATS structure checks</h2><div style={twoCol}>{Object.entries(ats.checks || {}).map(([k, v]: any) => <div key={k} style={{ padding: 12, border: '1px solid #e4e7ec', borderRadius: 9 }}><b>{v ? '✓' : '○'} {k}</b><div style={muted}>{v ? 'Detected' : 'Consider adding or improving this signal'}</div></div>)}</div></section>
      </>}
    </div>
  </div>;
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e4e7ec', borderRadius: 14, padding: 20, marginBottom: 14 };
const h2: React.CSSProperties = { fontFamily: 'Outfit', fontSize: 18, margin: '0 0 14px' };
const muted: React.CSSProperties = { fontSize: 12, color: '#667085', lineHeight: 1.6, marginTop: 5 };
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 7, color: '#344054' };
const textInput: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', border: '1px solid #D0D5DD', borderRadius: 9, padding: '11px 12px', fontSize: 13, background: '#fff', color: '#172033' };
const primaryButton: React.CSSProperties = { display: 'inline-block', background: '#3358E8', color: '#fff', padding: '10px 14px', borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { background: '#fff', border: '1px solid #D0D5DD', color: '#344054', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' };
const pill: React.CSSProperties = { background: '#EEF2FF', color: '#3358E8', borderRadius: 20, padding: '5px 9px', fontSize: 11, fontWeight: 800 };
const chip: React.CSSProperties = { display: 'inline-block', borderRadius: 20, background: '#F2F4F7', color: '#344054', padding: '6px 9px', fontSize: 11, margin: '3px 5px 3px 0' };
const chipWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 10 };
const list: React.CSSProperties = { paddingLeft: 20, margin: 0, lineHeight: 1.8, fontSize: 13, color: '#344054' };
const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 };
