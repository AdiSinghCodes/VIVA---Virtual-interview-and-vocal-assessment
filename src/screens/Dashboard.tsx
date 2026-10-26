import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Flame, Star, TrendingUp, UserRound } from 'lucide-react'
import type { Screen } from '../types'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'

interface Props { onNavigate:(s:Screen)=>void }
type Interview = any

const fallbackCourses = [
  {title:'Data Structures & Algorithms',category:'DSA',provider:'Learning resource',icon:'⚡',level:'Interview'},
  {title:'SQL & Database Interview Prep',category:'SQL',provider:'Learning resource',icon:'🗄️',level:'Technical'},
  {title:'System Design Fundamentals',category:'System Design',provider:'Learning resource',icon:'🏗️',level:'Technical'},
  {title:'React & Full Stack Development',category:'Web Development',provider:'Learning resource',icon:'⚛️',level:'Development'},
]

export default function Dashboard({onNavigate}:Props){
 const {user}=useAuth()
 const [interviews,setInterviews]=useState<Interview[]>([])
 const [courses,setCourses]=useState<any[]>([])
 const [loading,setLoading]=useState(true)
 const name=(user?.profile?.fullName||`${user?.firstName||''} ${user?.lastName||''}`).trim()||'there'
 const profile=user?.profile||{}
 const skills=String(profile.skills||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,6)

 useEffect(()=>{ let alive=true; (async()=>{
   try{
     const [ir,cr]=await Promise.all([
       api.listInterviews().catch(()=>({interviews:[]})),
       api.searchInternetCourses(`${profile.targetRole||'software developer'} ${profile.skills||''} interview preparation`).catch(()=>({results:[]})),
     ])
     if(alive){setInterviews(ir.interviews||ir.items||[]);setCourses((cr.results||[]).slice(0,4))}
   }finally{if(alive)setLoading(false)}
 })(); return()=>{alive=false} },[profile.targetRole,profile.skills])

 const stats=useMemo(()=>{
   const completed=interviews.filter(x=>x.status==='completed'||x.completedAt||x.finalScore!=null)
   const scores=completed.map(x=>Number(x.finalScore)).filter(Number.isFinite)
   return {count:completed.length,avg:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0}
 },[interviews])

 const recent=interviews.slice().sort((a,b)=>new Date(b.completedAt||b.startedAt||0).getTime()-new Date(a.completedAt||a.startedAt||0).getTime()).slice(0,5)
 const shownCourses=courses.length?courses:fallbackCourses
 return <div style={{minHeight:'100%',background:'#FAF9F5',padding:'32px 42px 60px',color:'#172033'}}>
  <div style={{maxWidth:1400,margin:'0 auto'}}>
   <section style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-end',marginBottom:28,flexWrap:'wrap'}}>
    <div>
      <div style={{fontSize:11,fontWeight:800,color:'#3358E8',letterSpacing:'.08em'}}>VIVA · PERSONAL DASHBOARD</div>
      <h1 style={{fontFamily:'Outfit',fontSize:30,margin:'7px 0'}}>Welcome back, {name} 👋</h1>
      <p style={{margin:0,color:'#697386',fontSize:14}}>Your dashboard is personalized from your profile and actual interview activity.</p>
      <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:12}}>
       {profile.targetRole&&<span style={pill}>{profile.targetRole}</span>}
       {profile.experienceLevel&&<span style={pill}>{profile.experienceLevel}</span>}
       {profile.difficulty&&<span style={pill}>{profile.difficulty} practice</span>}
      </div>
    </div>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
       <button onClick={()=>onNavigate('coding-assessment')} style={{...primary,background:'linear-gradient(135deg, #7B5CFA 0%, #3358E8 100%)'}}><span>⌨️ Coding & SQL Sandbox</span><ArrowRight size={16}/></button>
       <button onClick={()=>onNavigate('interview-setup')} style={primary}><span>Start an interview</span><ArrowRight size={16}/></button>
     </div>
   </section>

   <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:14,marginBottom:28}}>
    {[
      ['Interviews completed',stats.count,'🎯'],
      ['Average score',stats.avg?`${stats.avg}%`:'—','📈'],
      ['Profile readiness',user?.profileCompleted?'100%':'Incomplete','👤'],
      ['Skills on profile',skills.length||0,'🧠']
    ].map(([label,value,icon])=><div key={String(label)} style={card}><div style={{fontSize:22}}>{icon}</div><div style={{fontFamily:'Outfit',fontSize:24,fontWeight:800,marginTop:8}}>{value}</div><div style={{fontSize:11,color:'#8A93A5',marginTop:3}}>{label}</div></div>)}
   </div>

   <section style={{marginBottom:28}}>
    <div style={heading}><div><h2 style={h2}>Recommended for you</h2><p style={desc}>Live learning resources selected from your target role and skills.</p></div><button onClick={()=>onNavigate('courses')} style={link}>Explore courses <ArrowRight size={14}/></button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:14}}>
     {shownCourses.map((c:any,i:number)=><div key={(c.url||c.title||i)+i} style={courseCard}>
       <div style={{display:'flex',justifyContent:'space-between',gap:10}}><div style={icon}>{c.icon||'📚'}</div>{c.source&&<span style={source}>{c.source}</span>}</div>
       <span style={{fontSize:10,fontWeight:800,color:'#3358E8',textTransform:'uppercase'}}>{c.category||'Learning'}</span>
       <h3 style={{fontFamily:'Outfit',fontSize:16,margin:'5px 0',lineHeight:1.3}}>{c.title}</h3>
       <p style={{fontSize:12,color:'#687386',lineHeight:1.5,margin:'5px 0'}}>{c.provider||c.description||'Open this resource to start learning.'}</p>
       <button onClick={()=>c.url?window.open(c.url,'_blank','noopener,noreferrer'):onNavigate('courses')} style={courseBtn}>Open <ArrowRight size={13}/></button>
     </div>)}
    </div>
   </section>

   <div style={{display:'grid',gridTemplateColumns:'1.25fr .75fr',gap:14,marginBottom:28}}>
    <section style={card}><div style={heading}><div><h2 style={h2}>Interview progress</h2><p style={desc}>Calculated from MongoDB interview history.</p></div><button onClick={()=>onNavigate('reports')} style={link}>Reports <ArrowRight size={14}/></button></div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'1px solid #edf0f4',marginTop:16}}>
      <Metric value={stats.count} label="Completed"/>
      <Metric value={stats.avg?`${stats.avg}%`:'—'} label="Average"/>
      <Metric value={recent.length?`${Math.min(100,Math.round((recent.filter(x=>Number(x.finalScore)>=70).length/recent.length)*100))}%`:'—'} label="Recent pass rate"/>
     </div>
     {stats.count===0&&<div style={empty}>Complete your first interview to unlock real performance analytics.</div>}
    </section>
    <section style={card}><h2 style={h2}>Profile focus</h2><p style={desc}>Skills currently stored in your profile.</p>
      {skills.length?<div style={{marginTop:18,display:'flex',gap:8,flexWrap:'wrap'}}>{skills.map(s=><span key={s} style={skillPill}>{s}</span>)}</div>:<div style={empty}>Add skills in Profile to personalize your dashboard.</div>}
      <button onClick={()=>onNavigate('profile')} style={{...courseBtn,marginTop:20}}>Update profile <UserRound size={13}/></button>
    </section>
   </div>

   <section><div style={heading}><div><h2 style={h2}>Recent practice</h2><p style={desc}>Your latest saved interview sessions.</p></div></div>
    <div style={{background:'#fff',border:'1px solid #e4e7ec',borderRadius:14,overflow:'hidden'}}>
     {loading?<div style={empty}>Loading your interview history…</div>:recent.length?recent.map((x:any,i:number)=>{
       const score=Number(x.finalScore); const date=x.completedAt||x.startedAt
       return <div key={x._id||x.id||i} style={{padding:'14px 18px',borderBottom:i===recent.length-1?'none':'1px solid #edf0f4',display:'flex',justifyContent:'space-between',gap:12}}>
        <div><b style={{fontSize:13}}>{x.setup?.targetRole||x.setup?.role||profile.targetRole||'Interview'}</b><div style={{fontSize:11,color:'#8A93A5',marginTop:3}}>{x.setup?.interviewType||x.setup?.types?.join?.(', ')||x.setup?.type||'Practice'} · {date?new Date(date).toLocaleDateString():'Recent'}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:12}}><strong>{Number.isFinite(score)?`${Math.round(score)}%`:'—'}</strong>{Number.isFinite(score)&&score>=70?<CheckCircle2 size={16} color="#3358E8"/>:<Flame size={16} color="#C77B1E"/>}</div>
       </div>
     }):<div style={empty}>No interview sessions yet. Start one now.</div>}
    </div>
   </section>
  </div>
  <style>{`@media(max-width:1000px){.dashboard-grid{grid-template-columns:1fr 1fr}} @media(max-width:767px){.dashboard-page{padding:20px 15px}.dashboard-inner{width:100%}}`}</style>
 </div>
}
function Metric({value,label}:{value:any,label:string}){return <div style={{padding:'17px 12px 2px 0'}}><div style={{fontFamily:'Outfit',fontSize:22,fontWeight:800}}>{value}</div><div style={{fontSize:11,color:'#8A93A5',marginTop:3}}>{label}</div></div>}
const card:React.CSSProperties={background:'#fff',border:'1px solid #e4e7ec',borderRadius:14,padding:19}
const courseCard:React.CSSProperties={...card,minHeight:220,display:'flex',flexDirection:'column',gap:8}
const primary:React.CSSProperties={border:0,borderRadius:10,padding:'12px 17px',background:'#3358E8',color:'#fff',display:'flex',alignItems:'center',gap:8,fontWeight:800,cursor:'pointer'}
const pill:React.CSSProperties={padding:'5px 9px',borderRadius:100,background:'#fff',border:'1px solid #e4e7ec',fontSize:11,color:'#5B6478'}
const icon:React.CSSProperties={width:42,height:42,borderRadius:11,background:'#F1F3FF',display:'grid',placeItems:'center',fontSize:20}
const source:React.CSSProperties={fontSize:10,color:'#7B8497'}
const courseBtn:React.CSSProperties={marginTop:'auto',width:'100%',padding:9,borderRadius:9,border:'1px solid #dce2ef',background:'#f7f8fc',color:'#3358E8',display:'flex',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer',fontWeight:700}
const heading:React.CSSProperties={display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-end',marginBottom:15}
const h2:React.CSSProperties={fontFamily:'Outfit',fontSize:19,fontWeight:800,margin:0}
const desc:React.CSSProperties={fontSize:12.5,color:'#8A93A5',margin:'4px 0 0'}
const link:React.CSSProperties={border:0,background:'transparent',color:'#3358E8',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}
const empty:React.CSSProperties={padding:'24px 0',fontSize:12,color:'#8A93A5'}
const skillPill:React.CSSProperties={padding:'7px 10px',background:'#F4F5F7',borderRadius:8,fontSize:11.5,color:'#475467'}
