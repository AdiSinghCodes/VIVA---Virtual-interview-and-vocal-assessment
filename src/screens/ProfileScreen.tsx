
import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props { onNavigate:(s:Screen)=>void; onLogout?:()=>void; }

const fields = [
  ['fullName','Full name'],['phone','Phone'],['location','Location'],['targetRole','Target role'],
  ['experienceLevel','Experience level'],['yearsExperience','Years of experience'],['currentRole','Current role'],
  ['summary','Professional summary'],['skills','Skills (comma separated)'],['degree','Degree'],
  ['university','University'],['graduationYear','Graduation year'],['interviewType','Preferred interview type'],
  ['difficulty','Interview difficulty'],['language','Practice language'],['linkedin','LinkedIn'],
  ['github','GitHub'],['portfolio','Portfolio']
] as const;

const empty = {
 fullName:'', phone:'', location:'', targetRole:'', experienceLevel:'Student', yearsExperience:'',
 currentRole:'', summary:'', skills:'', degree:'', university:'', graduationYear:'',
 interviewType:'Technical + Behavioral', difficulty:'Intermediate', language:'English',
 linkedin:'', github:'', portfolio:''
};

export default function ProfileScreen({onNavigate,onLogout}:Props){
 const {user,saveProfile,uploadResume}=useAuth();
 const [draft,setDraft]=useState<any>({...empty,...(user?.profile||{}),fullName:user?.profile?.fullName||`${user?.firstName||''} ${user?.lastName||''}`.trim()});
 const [saving,setSaving]=useState(false), [uploading,setUploading]=useState(false), [message,setMessage]=useState('');
 useEffect(()=>{ if(user) setDraft({...empty,...user.profile,fullName:user.profile?.fullName||`${user.firstName} ${user.lastName}`.trim()}); },[user]);
 const set=(k:string,v:string)=>setDraft((p:any)=>({...p,[k]:v}));
 const save=async()=>{setSaving(true);setMessage('');try{await saveProfile(draft);setMessage('Profile saved successfully. Navigating to dashboard…');setTimeout(()=>onNavigate('dashboard'),300);}catch(e:any){setMessage(e.message)}finally{setSaving(false)}};
 const onResume=async(file?:File)=>{
   if(!file)return;
   setUploading(true);setMessage('Analyzing resume and autofilling your profile…');
   try{const r=await uploadResume(file);setDraft({...empty,...r.user.profile});setMessage(`Resume analyzed. ATS score: ${r.ats.score}/100. Review the autofilled fields and save.`);}
   catch(e:any){setMessage(e.message)}finally{setUploading(false)}
 };
 const complete=Boolean(user?.profileCompleted);
 return <div style={{minHeight:'100%',background:'#FAF9F5',padding:'28px 24px 100px',color:'#172033'}}>
   <div style={{maxWidth:960,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:15,marginBottom:18,flexWrap:'wrap'}}>
      <div><div style={{fontSize:11,fontWeight:800,color:'#3358E8',letterSpacing:'.08em'}}>VIVA · CANDIDATE PROFILE</div>
      <h1 style={{fontFamily:'Outfit',margin:'6px 0',fontSize:30}}>Candidate profile</h1>
      <p style={{margin:0,color:'#667085',fontSize:13}}>Upload your resume or fill details below, then click Save or Continue to Dashboard.</p></div>
      <button onClick={()=>onNavigate('dashboard')} style={{background:'#3358E8',color:'#fff',padding:'10px 18px',borderRadius:9,border:0,fontWeight:800,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
        Continue to Dashboard →
      </button>
    </div>
    <section style={{background:'#fff',border:'1px solid #e4e7ec',borderRadius:14,padding:18,marginBottom:14}}>
      <h2 style={{fontFamily:'Outfit',fontSize:18,margin:'0 0 12px'}}>Resume — autofill source</h2>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:15,flexWrap:'wrap',padding:14,border:'1px dashed #b9c1d0',borderRadius:10}}>
       <div><b>{user?.profile?.resume?.fileName||'No resume uploaded'}</b><div style={{fontSize:12,color:'#667085',marginTop:4}}>{uploading?'Extracting resume…':'PDF, DOCX or TXT · up to 10MB'}</div></div>
       <label style={{background:'#3358E8',color:'#fff',padding:'10px 15px',borderRadius:9,fontWeight:800,fontSize:12,cursor:'pointer'}}>{uploading?'Analyzing…':'Upload / Replace Resume'}<input disabled={uploading} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}} onChange={e=>onResume(e.target.files?.[0])}/></label>
      </div>
    </section>
    {message&&<div style={{padding:11,borderRadius:9,background:message.toLowerCase().includes('success')||message.includes('ATS')?'#EAF7F0':'#fff8e6',color:'#344054',marginBottom:14,fontSize:13}}>{message}</div>}
    <section style={{background:'#fff',border:'1px solid #e4e7ec',borderRadius:14,padding:20}}>
      <h2 style={{fontFamily:'Outfit',fontSize:18,margin:'0 0 16px'}}>Candidate details</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:14}}>
       {fields.map(([key,label])=>
        <label key={key} style={{display:'flex',flexDirection:'column',gap:6,gridColumn:key==='summary'||key==='skills'?'1 / -1':'auto'}}>
         <span style={{fontSize:11,fontWeight:800,color:'#667085',textTransform:'uppercase'}}>{label}</span>
         {key==='summary'?<textarea rows={4} value={draft[key]||''} onChange={e=>set(key,e.target.value)} style={inputStyle}/>:key==='experienceLevel'||key==='interviewType'||key==='difficulty'||key==='language'?<select value={draft[key]||''} onChange={e=>set(key,e.target.value)} style={inputStyle}>{(key==='experienceLevel'?['Student','Intern','Entry-level','Mid-level','Senior']:key==='interviewType'?['Technical','Behavioral','Technical + Behavioral','System Design','Case Study','Resume Based','Full Interview']:key==='difficulty'?['Beginner','Intermediate','Advanced','Senior Expert']:['English','Hindi','Marathi','English + Hindi']).map(x=><option key={x}>{x}</option>)}</select>:<input value={draft[key]||''} onChange={e=>set(key,e.target.value)} style={inputStyle}/>}
        </label>)}
      </div>
      <div style={{marginTop:18,display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
       <button onClick={onLogout} style={{padding:'10px 14px',border:'1px solid #ddd',borderRadius:9,background:'#fff',cursor:'pointer'}}>Logout</button>
       <div style={{display:'flex',gap:10}}>
        <button onClick={()=>onNavigate('resume-analysis')} style={{padding:'10px 14px',border:'1px solid #d0d5dd',borderRadius:9,background:'#fff',cursor:'pointer'}}>View Resume Analysis</button>
        <button disabled={saving||uploading} onClick={save} style={{padding:'10px 18px',border:0,borderRadius:9,background:'#3358E8',color:'#fff',fontWeight:800,cursor:'pointer'}}>{saving?'Saving…':'Save Profile & Continue →'}</button>
       </div>
      </div>
    </section>
   </div>
 </div>
}
const inputStyle:React.CSSProperties={width:'100%',boxSizing:'border-box',padding:'11px 12px',border:'1px solid #d9dee8',borderRadius:9,background:'#FAF9F5',font:'inherit',color:'#172033'};
