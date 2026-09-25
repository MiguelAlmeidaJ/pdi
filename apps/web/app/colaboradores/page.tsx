'use client';
import { useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type User={id:string;name:string;email:string;systemRole:string;active:boolean;hiredAt:string;team?:{id:string;name:string}|null;role?:{id:string;name:string}|null;currentRoleStep?:{id:string;code:string;label:string;salary:string;order:number}|null};

export default function Colaboradores(){
  const [data,setData]=useState<User[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{api<User[]>('/users').then(setData).catch(e=>setError(e.message))},[]);
  const filtered=useMemo(()=>data.filter(u=>[u.name,u.email,u.team?.name,u.role?.name].some(v=>v?.toLowerCase().includes(query.toLowerCase()))),[data,query]);

  return <AppLayout title="Colaboradores" description="Acompanhe posição atual, carreira e desenvolvimento individual." action={<button className="primary-action">+ Novo colaborador</button>}>
    {error&&<div className="form-error">{error}</div>}
    <section className="people-toolbar"><div><strong>{data.length}</strong><span> colaboradores cadastrados</span></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome, cargo ou time..."/></section>
    <section className="people-cards">
      {filtered.map(user=>{
        const initials=user.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
        return <Link href={'/colaboradores/'+user.id} className="people-card" key={user.id}>
          <div className="people-card-top"><div className="avatar large">{initials}</div><span className={user.active?'status-dot active':'status-dot'}>{user.active?'Ativo':'Inativo'}</span></div>
          <h2>{user.name}</h2><p>{user.email}</p>
          <div className="people-meta"><span>{user.role?.name||'Sem cargo'}</span><i>•</i><span>{user.team?.name||'Sem time'}</span></div>
          <div className="people-step"><div><small>STEP ATUAL</small><strong>{user.currentRoleStep?.label||'Não definido'}</strong></div><div className="salary-mini">{user.currentRoleStep?('R$ '+Number(user.currentRoleStep.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})):'—'}</div></div>
          <div className="people-card-footer"><span>Ver PDI individual</span><b>→</b></div>
        </Link>
      })}
    </section>
    {!filtered.length&&!error&&<div className="empty-state"><b>Nenhum colaborador encontrado</b><span>Ajuste a busca ou cadastre um novo colaborador.</span></div>}
  </AppLayout>
}