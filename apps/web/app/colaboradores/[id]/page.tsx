'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '../../../components/app-layout';
import { api } from '../../../lib/api';

type Profile={id:string;name:string;email:string;active:boolean;hiredAt:string;professionalSince?:string|null;currentRoleStepStartedAt?:string|null;systemRole:string;team?:{name:string}|null;role?:{id:string;name:string;description?:string|null;steps:{id:string;label:string;code:string;salary:string;order:number}[]}|null;currentRoleStep?:{id:string;label:string;code:string;salary:string;order:number}|null;manager?:{name:string;email:string}|null;careerHistory:{id:string;startedAt:string;endedAt?:string|null;reason?:string|null;salary:string;role:{id:string;name:string};roleStep:{id:string;code:string;label:string;order:number}}[]};
type Requirement={key:string;name:string;type:string;met:boolean;status?:string;requiredMonths?:number;currentMonths?:number;description?:string|null;notes?:string|null};
type Development={current:{role:{name:string};step:{label:string;code:string};salary:string;startedAt?:string|null;monthsInCurrentStep?:number};next:null|{label:string;code:string;salary:string};progress:{required:number;completed:number;percentage:number};requirements:Requirement[];eligibleForPromotion:boolean;careerComplete:boolean};

export default function Colaborador(){
  const {id}=useParams<{id:string}>();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [dev,setDev]=useState<Development|null>(null);
  const [error,setError]=useState('');
  const [moveOpen,setMoveOpen]=useState(false);
  const [targetStepId,setTargetStepId]=useState('');
  const [moveReason,setMoveReason]=useState('');
  const [effectiveAt,setEffectiveAt]=useState('');
  const [moving,setMoving]=useState(false);
  async function load(){
    try{
      const [p,d]=await Promise.all([api<Profile>('/users/'+id),api<Development>('/users/'+id+'/development')]);
      setProfile(p);setDev(d);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar PDI')}
  }
  useEffect(()=>{load()},[id]);

  async function moveCareerStep(){
    if(!targetStepId||!moveReason.trim())return;
    setMoving(true);setError('');
    try{
      await api('/users/'+id+'/career-step',{method:'PUT',body:JSON.stringify({targetRoleStepId:targetStepId,reason:moveReason,effectiveAt:effectiveAt||undefined})});
      setMoveOpen(false);setTargetStepId('');setMoveReason('');setEffectiveAt('');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao alterar etapa')}
    finally{setMoving(false)}
  }

  if(error)return <AppLayout title="PDI individual" description="Detalhes do desenvolvimento do colaborador."><div className="form-error">{error}</div></AppLayout>;
  if(!profile||!dev)return <AppLayout title="PDI individual" description="Carregando dados do colaborador..."><div className="skeleton-card"/></AppLayout>;

  const initials=profile.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const missing=Math.max(0,dev.progress.required-dev.progress.completed);

  return <AppLayout title="PDI individual" description="Acompanhe evolução, requisitos e próximo passo da carreira.">
    <Link href="/colaboradores" className="back-link">← Voltar para colaboradores</Link>

    <section className="profile-hero">
      <div className="avatar xl">{initials}</div>
      <div className="profile-main"><div className="profile-name-line"><h2>{profile.name}</h2><span className="status-pill">{profile.active?'Ativo':'Inativo'}</span></div><p>{profile.role?.name||'Sem cargo'} · {profile.team?.name||'Sem time'}</p><span>{profile.email}</span></div>
      <div className="profile-side"><small>GESTOR</small><strong>{profile.manager?.name||'Não definido'}</strong><button className="text-button profile-move-button" onClick={()=>{setTargetStepId(profile.currentRoleStep?.id||'');setMoveOpen(true)}}>Alterar etapa</button></div>
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
        <article className="panel info-card"><p className="eyebrow">INFORMAÇÕES</p><dl><div><dt>Admissão</dt><dd>{new Date(profile.hiredAt).toLocaleDateString('pt-BR')}</dd></div><div><dt>Nível atual desde</dt><dd>{profile.currentRoleStepStartedAt?new Date(profile.currentRoleStepStartedAt).toLocaleDateString('pt-BR'):'Não informado'}</dd></div><div><dt>Tempo no nível</dt><dd>{dev.current.monthsInCurrentStep??0} mês(es)</dd></div><div><dt>Perfil</dt><dd>{profile.systemRole}</dd></div><div><dt>Experiência desde</dt><dd>{profile.professionalSince?new Date(profile.professionalSince).toLocaleDateString('pt-BR'):'Não informado'}</dd></div></dl></article>
        <article className="promotion-cta"><span>↗</span><h3>{dev.eligibleForPromotion?'Elegível para promoção':'Próxima promoção'}</h3><p>{dev.eligibleForPromotion?'Todos os requisitos foram concluídos. O gestor já pode iniciar a análise.':'Faltam '+missing+' requisito(s) para atingir o próximo step.'}</p><button className="primary-button" disabled={!dev.eligibleForPromotion}>{dev.eligibleForPromotion?'Iniciar solicitação':'Ainda não elegível'}</button></article>
      </aside>
    </section>

    <section className="panel career-history-panel">
      <div className="panel-head"><div><p className="eyebrow">HISTÓRICO</p><h2>Movimentações de carreira</h2></div></div>
      {profile.careerHistory.length?<div className="career-history-list">{profile.careerHistory.map((item,index)=><div className="career-history-item" key={item.id}>
        <div className="career-history-marker">{index===0?'●':'○'}</div>
        <div className="career-history-main"><strong>{item.role.name} · {item.roleStep.label}</strong><span>{new Date(item.startedAt).toLocaleDateString('pt-BR')}{item.endedAt?' até '+new Date(item.endedAt).toLocaleDateString('pt-BR'):' · Atual'}</span>{item.reason&&<p>{item.reason}</p>}</div>
        <div className="career-history-salary">R$ {Number(item.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
      </div>)}</div>:<div className="empty-state compact"><span>Nenhuma movimentação registrada.</span></div>}
    </section>

    {moveOpen&&profile.role&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">MOVIMENTAÇÃO DE CARREIRA</p><h2>Alterar etapa de {profile.name}</h2><p>O gestor pode avançar diretamente para outro nível. A justificativa ficará registrada no histórico.</p></div><button className="modal-close" onClick={()=>setMoveOpen(false)}>×</button></div>
      <div className="career-move-current"><span>Atual</span><strong>{profile.currentRoleStep?.label||'Sem step'}</strong><b>→</b><span>Destino</span></div>
      <div className="form-grid two">
        <label>Nova etapa<select value={targetStepId} onChange={e=>setTargetStepId(e.target.value)}><option value="">Selecione...</option>{profile.role.steps.map(step=><option key={step.id} value={step.id} disabled={step.id===profile.currentRoleStep?.id}>{step.label} · R$ {Number(step.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</option>)}</select></label>
        <label>Data efetiva<input type="date" value={effectiveAt} onChange={e=>setEffectiveAt(e.target.value)}/><small className="field-help">Se vazio, será usada a data de hoje.</small></label>
        <label className="span-2">Justificativa<textarea value={moveReason} onChange={e=>setMoveReason(e.target.value)} placeholder="Ex.: Colaborador demonstrou domínio técnico e maturidade para avançar diretamente ao Step 3."/></label>
      </div>
      <div className="override-note"><strong>Exceção permitida pelo gestor</strong><span>Esta movimentação pode pular níveis e não depende do tempo mínimo ou de 100% dos requisitos. A decisão ficará registrada com a justificativa informada.</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setMoveOpen(false)}>Cancelar</button><button className="primary-action" disabled={moving||!targetStepId||targetStepId===profile.currentRoleStep?.id||moveReason.trim().length<5} onClick={moveCareerStep}>{moving?'Movendo...':'Confirmar movimentação'}</button></div>
    </div></div>}
  </AppLayout>
}