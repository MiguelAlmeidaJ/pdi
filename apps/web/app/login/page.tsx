'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

type LoginResponse = { accessToken: string; user: { id:string; name:string; email:string; systemRole:string } };

export default function LoginPage() {
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data=await api<LoginResponse>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
      localStorage.setItem('pdi_token',data.accessToken);
      localStorage.setItem('pdi_user',JSON.stringify(data.user));
      router.push('/');
    } catch(e){ setError(e instanceof Error?e.message:'Não foi possível entrar'); }
    finally{setLoading(false)}
  }

  return <main className="login-page"><section className="login-brand"><div className="login-copy"><div className="brand login-logo"><div className="brand-mark">P</div><div><strong>PDI</strong><span>Desenvolvimento</span></div></div><p className="eyebrow light">PLANO DE DESENVOLVIMENTO INDIVIDUAL</p><h1>Carreiras claras.<br/>Evolução mensurável.</h1><p>Transforme requisitos, competências e resultados em caminhos de crescimento transparentes para todo o time.</p><div className="login-feature"><b>01</b><span>Visualize o próximo passo da carreira</span></div><div className="login-feature"><b>02</b><span>Acompanhe requisitos e qualificações</span></div><div className="login-feature"><b>03</b><span>Conduza promoções com critérios objetivos</span></div></div></section><section className="login-form-wrap"><form className="login-card" onSubmit={submit}><p className="eyebrow">BEM-VINDO</p><h2>Acesse sua conta</h2><p>Entre com as credenciais cadastradas no PDI.</p><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" required /></label><label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" minLength={8} required /></label>{error&&<div className="form-error">{error}</div>}<button className="primary-button login-button" disabled={loading}>{loading?'Entrando...':'Entrar no PDI'}</button><small>O acesso e as permissões são definidos pelo administrador.</small></form></section></main>;
}
