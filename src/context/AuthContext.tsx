
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken } from '../api/api';

export type Profile = Record<string, any>;
export type User = {
  id: string; _id?: string; email: string; firstName: string; lastName: string;
  companyName?: string; profileCompleted: boolean; profile: Profile;
};

type AuthContextValue = {
  user: User | null; loading: boolean;
  login: (email:string,password:string)=>Promise<User>;
  signup: (data:Record<string,unknown>)=>Promise<User>;
  logout: ()=>void;
  refresh: ()=>Promise<User|null>;
  saveProfile: (profile:Profile)=>Promise<User>;
  uploadResume: (file:File)=>Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [user,setUser]=useState<User|null>(null);
  const [loading,setLoading]=useState(true);

  const refresh=async()=>{
    if(!localStorage.getItem('viva_token')) { setLoading(false); return null; }
    try { const r=await api.me(); setUser(r.user); return r.user; }
    catch { setToken(null); setUser(null); return null; }
    finally { setLoading(false); }
  };
  useEffect(()=>{ refresh(); },[]);

  const login=async(email:string,password:string)=>{
    const r=await api.login({email,password}); setToken(r.token); setUser(r.user); return r.user;
  };
  const signup=async(data:Record<string,unknown>)=>{
    const r=await api.signup(data); setToken(r.token); setUser(r.user); return r.user;
  };
  const logout=()=>{ setToken(null); setUser(null); };
  const saveProfile=async(profile:Profile)=>{
    const r=await api.updateProfile(profile); setUser(r.user); return r.user;
  };
  const uploadResume=async(file:File)=>{
    const r=await api.uploadResume(file); setUser(r.user); return r;
  };

  const value=useMemo(()=>({user,loading,login,signup,logout,refresh,saveProfile,uploadResume}),[user,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){ const c=useContext(AuthContext); if(!c) throw new Error('useAuth must be inside AuthProvider'); return c; }
