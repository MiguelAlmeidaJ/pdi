'use client';
import { useEffect,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Profile={id:string;name:string;email:string;active:boolean;hiredAt:string;professionalSince?:string|null;currentRoleStepStartedAt?:string|null;systemRole:string;team?:{name:string}|null;role?:{id:string;name:string;description?:string|null;steps:{id:string;label:string;code:string;salary:string;order:number}[]}|null;currentRoleStep?:{id:string;label:string;code:string;salary:string;order:number}|null;manager?:{name:string;email:string}|null;careerHistory:{id:string;startedAt:string;endedAt?:string|null;reason?:string|null;salary:string;role:{id:string;name:string};roleStep:{id:string;code:string;label:string;order:number}}[]};
type Requirement={key:string;source?:'AUTO'|'QUALIFICATION';name:string;type:string;met:boolean;status?:string;requiredMonths?:number;currentMonths?:number;description?:string|null;notes?:string|null;evidenceUrl?:string|null;submissionNotes?:string|null;submittedAt?:string|null;evaluatedAt?:string|null;evaluator?:{id:string;name:string}|null};
type Development={current:{role:{name:string};step:{label:string;code:string};salary:string;startedAt?:string|null;monthsInCurrentStep?:number};next:null|{label:string;code:string;salary:string};progress:{required:number;completed:number;percentage:number};requirements:Requirement[];eligibleForPromotion:boolean;careerComplete:boolean};

export default function MeuPdi(){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [dev,setDev]=useState<Development|null>(null);
  const [error,setError]=useState('');
  const [submissionOpen,setSubmissionOpen]=useState(false);
  const [submissionRequirement,setSubmissionRequirement]=useState<Requirement|null>(null);
  const [submissionEvidence,setSubmissionEvidence]=useState('');
  const [submissionNotes,setSubmissionNotes]=useState('');
  const [submitting,setSubmitting]=useState(false);

  async function load(){
    try{
      const [p,d]=await Promise.all([api<Profile>('/users/me'),api<Development>('/users/me/development')]);
      setProfile(p);setDev(d);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar seu PDI')}
  }
  useEffect(()=>{load()},[]);

  function openSubmission(requirement:Requirement){
    setSubmissionRequirement(requirement);
    setSubmissionEvidence(requirement.evidenceUrl||'');
    setSubmissionNotes(requirement.submissionNotes||'');
    setSubmissionOpen(true);
  }

  async function submitQualification(){
    if(!submissionRequirement||!submissionEvidence.trim())return;
    setSubmitting(true);setError('');
    try{
      await api('/users/me/qualifications/'+submissionRequirement.key+'/submission',{
        method:'PUT',
        body:JSON.stringify({evidenceUrl:submissionEvidence,notes:submissionNotes||undefined})
      });
      setSubmissionOpen(false);setSubmissionRequirement(null);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao enviar evidência')}
    finally{setSubmitting(false)}
  }

  if(error)return <AppLayout title="Meu desenvolvimento" description="Acompanhe sua evolução no PDI."><div className="form-error">{error}</div></AppLayout>;
  if(!profile||!dev)return <AppLayout title="Meu desenvolvimento" description="Carregando seu plano..."><div className="skeleton-card"/></AppLayout>;

  const initials=profile.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const missing=Math.max(0,dev.progress.required-dev.progress.completed);

  return <AppLayout title="Meu desenvolvimento" description="Veja onde você está, o que falta e qual é o próximo passo da sua carreira.">
    <section className="my-pdi-hero">
      <div className="avatar xl">{initials}</div>
      <div className="profile-main">
        <p className="eyebrow">SEU PDI</p>
        <div className="profile-name-line"><h2>{profile.name}</h2><span className="status-pill">{profile.active?'Ativo':'Inativo'}</span></div>
        <p>{profile.role?.name||'Sem cargo'} · {profile.team?.name||'Sem time'}</p>
        <span>{profile.manager?.name?'Gestor: '+profile.manager.name:'Gestor não definido'}</span>
      </div>
      <div className="my-pdi-score"><div className="progress-circle" style={{'--progress':dev.progress.percentage} as React.CSSProperties}><strong>{dev.progress.percentage}%</strong></div><div><small>PROGRESSO ATUAL</small><b>{dev.progress.completed} de {dev.progress.required}</b><span>requisitos concluídos</span></div></div>
    </section>

    <section className="career-overview employee">
      <article className="career-now"><p className="eyebrow">VOCÊ ESTÁ AQUI</p><h3>{dev.current.step.label}</h3><span>{dev.current.role.name}</span><strong>R$ {Number(dev.current.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></article>
      <div className="career-arrow">→</div>
      <article className="career-next"><p className="eyebrow">PRÓXIMO PASSO</p>{dev.next?<><h3>{dev.next.label}</h3><span>{dev.current.role.name}</span><strong>R$ {Number(dev.next.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></>:<><h3>Trilha concluída</h3><span>Você chegou ao último nível</span><strong>—</strong></>}</article>
      <article className="employee-tenure-card"><small>TEMPO NO NÍVEL</small><strong>{dev.current.monthsInCurrentStep??0} mês(es)</strong><span>{profile.currentRoleStepStartedAt?'Desde '+new Date(profile.currentRoleStepStartedAt).toLocaleDateString('pt-BR'):'Data não informada'}</span></article>
    </section>

    <section className="pdi-grid employee">
      <article className="panel requirements-panel">
        <div className="panel-head"><div><p className="eyebrow">SEU PLANO</p><h2>O que falta para o próximo step</h2></div><span className={dev.eligibleForPromotion?'ready-badge':'pending-badge'}>{dev.eligibleForPromotion?'Todos os requisitos concluídos':'Em desenvolvimento'}</span></div>
        <div className="requirement-list">{dev.requirements.map(r=><div className={'requirement-item '+(r.met?'done':'')} key={r.key}><div className="requirement-check">{r.met?'✓':r.status==='AWAITING_REVIEW'?'⌛':'○'}</div><div><strong>{r.name}</strong><span>{r.requiredMonths!=null?String(r.currentMonths||0)+' de '+String(r.requiredMonths)+' meses':r.description||r.notes||r.type}</span>{r.submittedAt&&<small className="evaluation-meta">Enviado para avaliação em {new Date(r.submittedAt).toLocaleDateString('pt-BR')}</small>}{r.evaluator&&r.evaluatedAt&&<small className="evaluation-meta">Avaliado por {r.evaluator.name} · {new Date(r.evaluatedAt).toLocaleDateString('pt-BR')}</small>}{r.evidenceUrl&&<a className="requirement-evidence" href={r.evidenceUrl} target="_blank" rel="noreferrer">Ver evidência ↗</a>}</div><div className="requirement-actions"><em>{r.met?'Concluído':r.status==='AWAITING_REVIEW'?'Aguardando avaliação':r.status==='IN_PROGRESS'?'Em andamento':r.status==='REJECTED'?'Revisar':'Pendente'}</em>{r.source==='QUALIFICATION'&&r.status!=='COMPLETED'&&<button className="evaluate-button" onClick={()=>openSubmission(r)}>{r.status==='AWAITING_REVIEW'?'Atualizar envio':'Enviar evidência'}</button>}</div></div>)}</div>
        {!dev.requirements.length&&<div className="empty-state compact"><b>Nenhum requisito pendente</b><span>{dev.careerComplete?'Você chegou ao último step da trilha.':'Seu próximo step ainda não possui requisitos cadastrados.'}</span></div>}
      </article>

      <aside className="pdi-side">
        <article className="panel info-card"><p className="eyebrow">SUA JORNADA</p><dl><div><dt>Admissão</dt><dd>{new Date(profile.hiredAt).toLocaleDateString('pt-BR')}</dd></div><div><dt>Nível atual desde</dt><dd>{profile.currentRoleStepStartedAt?new Date(profile.currentRoleStepStartedAt).toLocaleDateString('pt-BR'):'Não informado'}</dd></div><div><dt>Experiência desde</dt><dd>{profile.professionalSince?new Date(profile.professionalSince).toLocaleDateString('pt-BR'):'Não informado'}</dd></div></dl></article>
        <article className={dev.eligibleForPromotion?'employee-status-card ready':'employee-status-card'}><span>{dev.eligibleForPromotion?'✓':'↗'}</span><h3>{dev.eligibleForPromotion?'Você concluiu os requisitos':'Continue evoluindo'}</h3><p>{dev.eligibleForPromotion?'Seu gestor já pode avaliar sua progressão para o próximo step.':'Faltam '+missing+' requisito(s) para completar o próximo nível.'}</p></article>
      </aside>
    </section>

    <section className="panel career-history-panel">
      <div className="panel-head"><div><p className="eyebrow">HISTÓRICO</p><h2>Sua evolução de carreira</h2></div></div>
      {profile.careerHistory.length?<div className="career-history-list">{profile.careerHistory.map((item,index)=><div className="career-history-item" key={item.id}><div className="career-history-marker">{index===0?'●':'○'}</div><div className="career-history-main"><strong>{item.role.name} · {item.roleStep.label}</strong><span>{new Date(item.startedAt).toLocaleDateString('pt-BR')}{item.endedAt?' até '+new Date(item.endedAt).toLocaleDateString('pt-BR'):' · Atual'}</span>{item.reason&&<p>{item.reason}</p>}</div><div className="career-history-salary">R$ {Number(item.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>)}</div>:<div className="empty-state compact"><span>Nenhuma movimentação registrada.</span></div>}
    </section>
    {submissionOpen&&submissionRequirement&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">ENVIAR PARA AVALIAÇÃO</p><h2>{submissionRequirement.name}</h2><p>Compartilhe uma evidência para seu gestor avaliar esta qualificação.</p></div><button className="modal-close" onClick={()=>setSubmissionOpen(false)}>×</button></div>
      <div className="submission-explainer"><span>1</span><div><strong>Envie sua evidência</strong><small>Certificado, documento, link de atividade ou outro material que demonstre a habilidade.</small></div><b>→</b><span>2</span><div><strong>Seu gestor avalia</strong><small>Somente o gestor pode concluir ou rejeitar o requisito.</small></div></div>
      <div className="form-grid two evaluation-form">
        <label className="span-2">Link da evidência<input type="url" value={submissionEvidence} onChange={e=>setSubmissionEvidence(e.target.value)} placeholder="https://..."/></label>
        <label className="span-2">Comentário para o gestor<textarea value={submissionNotes} onChange={e=>setSubmissionNotes(e.target.value)} placeholder="Ex.: Concluí o treinamento e apliquei o conhecimento no atendimento do chamado #1234."/></label>
      </div>
      <div className="submission-note"><strong>Ao enviar</strong><span>O requisito ficará como “Aguardando avaliação” e ainda não contará como concluído no seu progresso.</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setSubmissionOpen(false)}>Cancelar</button><button className="primary-action" disabled={submitting||!submissionEvidence.trim()} onClick={submitQualification}>{submitting?'Enviando...':'Enviar para avaliação'}</button></div>
    </div></div>}
  </AppLayout>
}
