'use client';

import { FormEvent,useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye,FiEyeOff,FiLock,FiMail } from 'react-icons/fi';
import { api } from '../../lib/api';
import { TrilhaBrand } from '../../components/trilha-brand';

type LoginResponse={accessToken:string;user:{id:string;name:string;email:string;systemRole:string}};

export default function LoginPage(){
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [remember,setRemember]=useState(true);
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const remembered=localStorage.getItem('trilha_login_email');
    if(remembered)setEmail(remembered);
  },[]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setError('');
    setLoading(true);
    try{
      const data=await api<LoginResponse>('/auth/login',{
        method:'POST',
        body:JSON.stringify({email,password}),
      });
      localStorage.setItem('pdi_token',data.accessToken);
      localStorage.setItem('pdi_user',JSON.stringify(data.user));
      if(remember)localStorage.setItem('trilha_login_email',email);
      else localStorage.removeItem('trilha_login_email');
      router.push(data.user.systemRole==='USER'?'/meu-pdi':'/');
    }catch(e){
      setError(e instanceof Error?e.message:'Não foi possível entrar');
    }finally{
      setLoading(false);
    }
  }

  return <main className="helpdesk-login-page">
    <div className="helpdesk-login-overlay"/>
    <section className="helpdesk-login-shell">
      <div className="helpdesk-login-brand">
        <div className="helpdesk-brand-logo"><TrilhaBrand theme="dark"/></div>
        <div className="helpdesk-brand-copy">
          <h1>Evolução profissional com clareza</h1>
          <p>Acompanhe cada etapa da carreira, requisitos e próximos passos em uma experiência simples e objetiva.</p>
        </div>
        <div className="helpdesk-brand-trail" aria-hidden="true">
          <span/><i/><span/><i/><span/>
        </div>
      </div>

      <div className="helpdesk-login-form-panel">
        <form className="helpdesk-login-card" onSubmit={submit}>
          <div className="helpdesk-login-heading">
            <h2>Acesse sua conta</h2>
            <p>Bem-vindo de volta à Trilha.</p>
          </div>

          <label className="helpdesk-field">
            <span>E-mail</span>
            <div><FiMail/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email" required/></div>
          </label>

          <label className="helpdesk-field">
            <span>Senha</span>
            <div><FiLock/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" minLength={8} autoComplete="current-password" required/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?<FiEyeOff/>:<FiEye/>}</button></div>
          </label>

          <div className="helpdesk-login-options">
            <label className="remember-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Lembrar e-mail</span></label>
          </div>

          {error&&<div className="form-error">{error}</div>}

          <button className="helpdesk-login-button" disabled={loading}>{loading?'Entrando...':'Entrar'}</button>
          <small>O acesso e as permissões são definidos pelo administrador.</small>
        </form>
      </div>
    </section>
  </main>;
}
