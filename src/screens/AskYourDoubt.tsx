import { useEffect, useRef, useState } from 'react'
import { Bot, Send, User, Sparkles } from 'lucide-react'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'

interface Message { id:string; role:'user'|'assistant'; content:string; timestamp:Date }

export default function AskYourDoubt(){
 const {user}=useAuth()
 const [messages,setMessages]=useState<Message[]>([])
 const [input,setInput]=useState('')
 const [busy,setBusy]=useState(false)
 const scroll=useRef<HTMLDivElement>(null)
 const name=(user?.profile?.fullName||`${user?.firstName||''} ${user?.lastName||''}`).trim()||'there'
 useEffect(()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'})},[messages,busy])
 const send=async(text=input)=>{
  const q=text.trim(); if(!q||busy)return
  setMessages(m=>[...m,{id:crypto.randomUUID(),role:'user',content:q,timestamp:new Date()}]);setInput('');setBusy(true)
  try{const r=await api.askAI(q);setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',content:r.answer||'No answer returned.',timestamp:new Date()}])}
  catch(e:any){setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',content:`AI service error: ${e?.message||'Check the backend and GROQ_API_KEY.'}`,timestamp:new Date()}])}
  finally{setBusy(false)}
 }
 const suggestions=['Review my interview performance','How should I prepare for my target role?','Explain a difficult DSA concept','What skills should I improve next?']
 return <div style={{height:'calc(100vh - 64px)',minHeight:560,background:'#FAF9F5',display:'flex',flexDirection:'column',fontFamily:'Inter'}}>
  <header style={{padding:'18px 24px',background:'#fff',borderBottom:'1px solid #e4e7ec',display:'flex',alignItems:'center',gap:12}}>
   <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#3358E8,#7B5CFA)',display:'grid',placeItems:'center',color:'#fff'}}><Sparkles size={19}/></div>
   <div><b>Ask your AI</b><div style={{fontSize:11,color:'#7B8497'}}>Personalized for {name} using your profile and VIVA interview data.</div></div>
  </header>
  <div ref={scroll} style={{flex:1,overflowY:'auto',padding:24}}>
   {!messages.length?<div style={{maxWidth:680,margin:'10vh auto',textAlign:'center'}}><Bot size={38} color="#3358E8"/><h2 style={{fontFamily:'Outfit'}}>What can I help you with?</h2><p style={{color:'#7B8497',fontSize:13}}>Ask about DSA, SQL, system design, interviews, your profile, resume or career preparation.</p><div style={{display:'flex',flexWrap:'wrap',gap:9,justifyContent:'center',marginTop:18}}>{suggestions.map(s=><button key={s} onClick={()=>send(s)} style={{padding:'10px 13px',background:'#fff',border:'1px solid #e4e7ec',borderRadius:10,cursor:'pointer'}}>{s}</button>)}</div></div>:<div style={{maxWidth:760,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>{messages.map(m=><div key={m.id} style={{display:'flex',gap:9,justifyContent:m.role==='user'?'flex-end':'flex-start'}}><div style={{width:32,height:32,borderRadius:'50%',background:m.role==='user'?'#7B5CFA':'#3358E8',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>{m.role==='user'?<User size={15}/>:<Bot size={15}/>}</div><div style={{maxWidth:'78%',padding:'12px 15px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'#3358E8':'#fff',color:m.role==='user'?'#fff':'#172033',whiteSpace:'pre-wrap',lineHeight:1.6,fontSize:13.5,border:'1px solid #e4e7ec'}}>{m.content}<div style={{fontSize:9,opacity:.55,marginTop:5}}>{m.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div></div>)}{busy&&<div style={{fontSize:12,color:'#7B8497'}}>VIVA is thinking…</div>}</div>}
  </div>
  <form onSubmit={e=>{e.preventDefault();send()}} style={{padding:'12px 24px 18px',background:'rgba(250,249,245,.96)',borderTop:'1px solid #e4e7ec',display:'flex',gap:9}}>
   <input value={input} onChange={e=>setInput(e.target.value)} disabled={busy} placeholder="Ask anything about your preparation…" style={{flex:1,padding:'12px 14px',border:'1px solid #d9dee8',borderRadius:10,outline:0}}/>
   <button disabled={busy||!input.trim()} style={{width:46,border:0,borderRadius:10,background:'#3358E8',color:'#fff',display:'grid',placeItems:'center'}}><Send size={17}/></button>
  </form>
 </div>
}
