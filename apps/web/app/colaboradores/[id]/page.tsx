'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '../../../components/app-layout';
import { api } from '../../../lib/api';

type Profile={id:string;name:string;email:string;active:boolean;hiredAt:string;professionalSince?:string|null;systemRole:string;team?:{name:string}|null;role?:{name:string;description?:string|null}|null;currentRoleStep?:{label:string;code:string;salary:string}|null;manager?:{name:string;email:string}|null};
type Requirement={key:string;name:string;type:string;met:boolean;status?:string;requiredMonths?:number;currentMonths?:number;description?:string|null;notes?:string|null};
type Development={current:{role:{name:string};step:{label:string;code:string};salary:string};next:null|{label:string;code:string;salary:string};progress:{required:number;completed:number;percentage:number};requirements:Requirement[];eligibleForPromotion:boolean;careerComplete:boolean};

export default function Colaborador(){
  const {id}=useParams<{id:string}>();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [dev,setDev]=useState<Development|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{Promise.all([api<Profile>('/users/'+id),api<Development>('/users/'+id+'/development')]).then(([p,d])=>{setProfile(p);setDev(d)}).catch(e=>setError(e.message))},[id]);

  if(error)return <AppLayout title="PDI individual" description="Detalhes do desenvolvimento do colaborador."><div className="form-error">{error}</div></AppLayout>;
  if(!profile||!dev)return <AppLayout title="PDI individual" description="Carregando dados do colaborador..."><div className="skeleton-card"/></AppLayout>;

  const initials=profile.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const missing=Math.max(0,dev.progress.required-dev.progress.completed);

  return <AppLayout title="PDI individual" description="Acompanhe evolução, requisitos e próximo passo da carreira.">
    <Link href="/colaboradores" className="back-link">← Voltar para colaboradores</Link>

    <section className="profile-hero">
      <div className="avatar xl">{initials}</div>
      <div className="profile-main"><div className="profile-name-line"><h2>{profile.name}</h2><span className="status-pill">{profile.active?'Ativo':'Inativo'}</span></div><p>{profile.role?.name||'Sem cargo'} · {profile.team?.name||'Sem time'}</p><span>{profile.email}</span></div>
      <div className="profile-side"><small>GESTOR</small><strong>{profile.manager?.name||'Não definido'}</strong></div>
    </section>

    <section className="career-overview">
      <article className="career-now"><p className="eyebrow">POSIÇÃO ATUAL</p><h3>{dev.current.step.label}</h3><span>{dev.current.role.name}</span><strong>R$ {Number(dev.current.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></article>
      <div className="career-arrow">→</div>
      <article className="career-next"><p className="eyebrow">PRÓXIMO PASSO</p>{dev.next?<><h3>{dev.next.label}</h3><span>{dev.current.role.name}</span><strong>R$ {Number(dev.next.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></>:<><h3>Trilha concluída</h3><span>Último step do cargo</span><strong>—</strong></>}</article>
      <article className="career-progress-card"><div className="progress-circle" style={{'--progress':dev.progress.percentage} as React.CSSProperties}><strong>{dev.progress.percentage}%</strong></div><div><small>PROGRESSO</small><b>{dev.progress.completed} de {dev.progress.required}</b><span>requisitos concluídos</span></div></article>
    </section>

    <section className="pdi-grid">
      <article className="panel requirements-panel">
        <div className="panel-head"><div><p className="eyebrow">REQUISITOS</p><h2>Plano para o próximo step</h2></div><span className={dev.eligibleForPromotion?'ready-badge':'pending-badge'}>{dev.eligibleForPromotion?'Pronto para promoção':'Em desenvolvimento'}</span></div>
        <div className="requirement-list">{dev.requirements.map(r=><div className={'requirement-item '+(r.met?'done':'')} key={r.key}><div className="requirement-check">{r.met?'✓':'○'}</div><div><strong>{r.name}</strong><span>{r.requiredMonths!=null?String(r.currentMonths||0)+' de '+String(r.requiredMonths)+' meses':r.description||r.notes||r.type}</span></div><em>{r.met?'Concluído':r.status==='IN_PROGRESS'?'Em andamento':'Pendente'}</em></div>)}</div>
        {!dev.requirements.length&&<div className="empty-state compact"><b>Nenhum requisito pendente</b><span>{dev.careerComplete?'Este colaborador chegou ao último step.':'O próximo step não possui requisitos cadastrados.'}</span></div>}
      </article>

      <aside className="pdi-side">
        <article className="panel info-card"><p className="eyebrow">INFORMAÇÕES</p><dl><div><dt>Admissão</dt><dd>{new Date(profile.hiredAt).toLocaleDateString('pt-BR')}</dd></div><div><dt>Perfil</dt><dd>{profile.systemRole}</dd></div><div><dt>Experiência desde</dt><dd>{profile.professionalSince?new Date(profile.professionalSince).toLocaleDateString('pt-BR'):'Não informado'}</dd></div></dl></article>
        <article className="promotion-cta"><span>↗</span><h3>{dev.eligibleForPromotion?'Elegível para promoção':'Próxima promoção'}</h3><p>{dev.eligibleForPromotion?'Todos os requisitos foram concluídos. O gestor já pode iniciar a análise.':'Faltam '+missing+' requisito(s) para atingir o próximo step.'}</p><button className="primary-button" disabled={!dev.eligibleForPromotion}>{dev.eligibleForPromotion?'Iniciar solicitação':'Ainda não elegível'}</button></article>
      </aside>
    </section>
  </AppLayout>
}