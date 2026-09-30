'use client';

import { useEffect,useState } from 'react';
import {
  FiArrowRight,
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiClock,
  FiExternalLink,
  FiBookOpen,
  FiPlayCircle,
  FiSend,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Profile={
  id:string;
  name:string;
  email:string;
  active:boolean;
  hiredAt:string;
  professionalSince?:string|null;
  currentRoleStepStartedAt?:string|null;
  systemRole:string;
  team?:{name:string}|null;
  role?:{id:string;name:string;description?:string|null;steps:{id:string;label:string;code:string;salary:string;order:number}[]}|null;
  currentRoleStep?:{id:string;label:string;code:string;salary:string;order:number}|null;
  manager?:{name:string;email:string}|null;
  careerHistory:{id:string;startedAt:string;endedAt?:string|null;reason?:string|null;salary:string;role:{id:string;name:string};roleStep:{id:string;code:string;label:string;order:number}}[];
};

type Requirement={
  key:string;
  source?:'AUTO'|'QUALIFICATION';
  name:string;
  type:string;
  met:boolean;
  status?:string;
  requiredMonths?:number;
  currentMonths?:number;
  description?:string|null;
  notes?:string|null;
  evidenceUrl?:string|null;
  submissionNotes?:string|null;
  submittedAt?:string|null;
  evaluatedAt?:string|null;
  evaluator?:{id:string;name:string}|null;
  links?:{id?:string;title:string;url:string;order?:number}[];
  referenceUrl?:string|null;
};

type Development={
  current:{role:{name:string};step:{label:string;code:string};salary:string;startedAt?:string|null;monthsInCurrentStep?:number};
  next:null|{label:string;code:string;salary:string};
  progress:{required:number;completed:number;percentage:number};
  requirements:Requirement[];
  eligibleForPromotion:boolean;
  careerComplete:boolean;
};

type Notification={id:string;type:string;title:string;message:string;href?:string|null;readAt?:string|null;createdAt:string};

function requirementStatus(requirement:Requirement){
  if(requirement.met)return {label:'Concluído',tone:'done'};
  if(requirement.status==='AWAITING_REVIEW')return {label:'Em avaliação',tone:'review'};
  if(requirement.status==='IN_PROGRESS')return {label:'Em andamento',tone:'progress'};
  if(requirement.status==='REJECTED')return {label:'Revisar',tone:'rejected'};
  return {label:'Pendente',tone:'pending'};
}

export default function MeuPdi(){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [dev,setDev]=useState<Development|null>(null);
  const [error,setError]=useState('');
  const [submissionOpen,setSubmissionOpen]=useState(false);
  const [submissionRequirement,setSubmissionRequirement]=useState<Requirement|null>(null);
  const [submissionEvidence,setSubmissionEvidence]=useState('');
  const [submissionNotes,setSubmissionNotes]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [notifications,setNotifications]=useState<Notification[]>([]);

  async function load(){
    try{
      const [p,d,n]=await Promise.all([
        api<Profile>('/users/me'),
        api<Development>('/users/me/development'),
        api<Notification[]>('/notifications?unreadOnly=true'),
      ]);
      setProfile(p);
      setDev(d);
      setNotifications(n);
      setError('');
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao carregar sua Trilha');
    }
  }

  useEffect(()=>{void load()},[]);

  function openSubmission(requirement:Requirement){
    setSubmissionRequirement(requirement);
    setSubmissionEvidence(requirement.evidenceUrl||'');
    setSubmissionNotes(requirement.submissionNotes||'');
    setSubmissionOpen(true);
  }

  async function submitQualification(){
    if(!submissionRequirement||!submissionEvidence.trim())return;
    setSubmitting(true);
    setError('');
    try{
      await api('/users/me/qualifications/'+submissionRequirement.key+'/submission',{
        method:'PUT',
        body:JSON.stringify({evidenceUrl:submissionEvidence,notes:submissionNotes||undefined}),
      });
      setSubmissionOpen(false);
      setSubmissionRequirement(null);
      await load();
    }catch(e){
      setError(e instanceof Error?e.message:'Erro ao enviar evidência');
    }finally{
      setSubmitting(false);
    }
  }

  if(error){
    return <AppLayout title="Minha Trilha" description="Acompanhe sua evolução profissional."><div className="form-error">{error}</div></AppLayout>;
  }

  if(!profile||!dev){
    return <AppLayout title="Minha Trilha" description="Carregando sua evolução..."><div className="skeleton-card"/></AppLayout>;
  }

  const initials=profile.name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase();
  const missing=Math.max(0,dev.progress.required-dev.progress.completed);
  const recentNotifications=notifications.slice(0,2);
  const courseRequirements=dev.requirements.filter(requirement=>requirement.source==='QUALIFICATION'&&requirement.type==='COURSE');
  const pendingCourses=courseRequirements.filter(requirement=>!requirement.met);
  const completedCourses=courseRequirements.filter(requirement=>requirement.met);

  function providerLabel(url:string){
    const value=url.toLowerCase();
    if(value.includes('udemy.com'))return 'Udemy';
    if(value.includes('youtube.com')||value.includes('youtu.be'))return 'YouTube';
    if(value.includes('coursera.org'))return 'Coursera';
    if(value.includes('alura.com.br'))return 'Alura';
    return 'Material externo';
  }

  return <AppLayout title="Minha Trilha" description="Seu momento atual, os próximos marcos e o caminho para continuar evoluindo.">
    {recentNotifications.length>0&&<section className="trail-updates">
      <div className="trail-updates-copy">
        <span className="trail-updates-icon"><FiTrendingUp/></span>
        <div><strong>Você tem {notifications.length} atualização(ões)</strong><small>{recentNotifications.map(item=>item.title).join(' · ')}</small></div>
      </div>
      <a href="/notificacoes">Ver atualizações <FiArrowRight/></a>
    </section>}

    <section className="trail-hero">
      <div className="trail-hero-person">
        <div className="trail-avatar">{initials}</div>
        <div>
          <div className="trail-name-line"><h2>{profile.name}</h2><span className="status-pill">{profile.active?'Ativo':'Inativo'}</span></div>
          <p>{profile.role?.name||'Sem cargo'} <i>•</i> {profile.team?.name||'Sem time'}</p>
          <span><FiUser/>{profile.manager?.name?'Gestor: '+profile.manager.name:'Gestor não definido'}</span>
        </div>
      </div>

      <div className="trail-progress">
        <div className="trail-progress-ring" style={{'--progress':dev.progress.percentage} as React.CSSProperties}>
          <div><strong>{dev.progress.percentage}%</strong><span>concluído</span></div>
        </div>
        <div className="trail-progress-copy">
          <small>PRÓXIMO MARCO</small>
          <strong>{dev.next?dev.next.label:'Trilha concluída'}</strong>
          <span>{dev.progress.completed} de {dev.progress.required} requisitos concluídos</span>
        </div>
      </div>
    </section>

    <section className="trail-path-card">
      <div className="trail-path-head">
        <div><p className="eyebrow">SUA EVOLUÇÃO</p><h2>Onde você está na trilha</h2></div>
        <span className={dev.eligibleForPromotion?'trail-status ready':'trail-status'}>{dev.eligibleForPromotion?'Pronto para avaliação':'Em desenvolvimento'}</span>
      </div>

      <div className="trail-path">
        <article className="trail-path-node current">
          <span className="trail-node-marker"><FiCheck/></span>
          <small>STEP ATUAL</small>
          <strong>{dev.current.step.label}</strong>
          <p>{dev.current.role.name}</p>
          <b>R$ {Number(dev.current.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b>
        </article>

        <div className="trail-path-line">
          <span className="trail-line-fill" style={{width:Math.min(100,Math.max(8,dev.progress.percentage))+'%'}}/>
          <i/>
        </div>

        <article className="trail-path-node next">
          <span className="trail-node-marker"><FiArrowRight/></span>
          <small>PRÓXIMO STEP</small>
          <strong>{dev.next?.label||'Objetivo alcançado'}</strong>
          <p>{dev.next?dev.current.role.name:'Você chegou ao último nível'}</p>
          <b>{dev.next?'R$ '+Number(dev.next.salary).toLocaleString('pt-BR',{minimumFractionDigits:2}):'—'}</b>
        </article>
      </div>

      <div className="trail-path-meta">
        <div><FiClock/><span>Tempo no step</span><strong>{dev.current.monthsInCurrentStep??0} mês(es)</strong></div>
        <div><FiCalendar/><span>Desde</span><strong>{profile.currentRoleStepStartedAt?new Date(profile.currentRoleStepStartedAt).toLocaleDateString('pt-BR'):'Não informado'}</strong></div>
        <div><FiAward/><span>Requisitos restantes</span><strong>{missing}</strong></div>
      </div>
    </section>

    {courseRequirements.length>0&&<section className="panel trail-courses-card">
      <div className="panel-head">
        <div>
          <p className="eyebrow">CURSOS DA SUA TRILHA</p>
          <h2>O que você precisa estudar</h2>
          <p className="panel-description">Acesse os cursos e materiais vinculados às qualificações exigidas para o próximo step.</p>
        </div>
        <span className="trail-course-summary">{pendingCourses.length} pendente(s)</span>
      </div>

      <div className="trail-course-grid">
        {pendingCourses.map(course=><article className="trail-course-card" key={course.key}>
          <div className="trail-course-icon"><FiBookOpen/></div>
          <div className="trail-course-copy">
            <div className="trail-course-title">
              <strong>{course.name}</strong>
              <span>Pendente</span>
            </div>
            <p>{course.description||course.notes||'Curso necessário para avançar para o próximo step.'}</p>

            <div className="trail-course-links">
              {(course.links||[]).map(link=><a href={link.url} target="_blank" rel="noreferrer" key={link.url+link.title}>
                <FiPlayCircle/>
                <div><strong>{link.title}</strong><span>{providerLabel(link.url)}</span></div>
                <FiExternalLink/>
              </a>)}
              {!course.links?.length&&course.referenceUrl&&<a href={course.referenceUrl} target="_blank" rel="noreferrer">
                <FiPlayCircle/>
                <div><strong>Abrir material do curso</strong><span>{providerLabel(course.referenceUrl)}</span></div>
                <FiExternalLink/>
              </a>}
            </div>
          </div>
          <button className="trail-evidence-button" onClick={()=>openSubmission(course)}><FiSend/> Enviar evidência</button>
        </article>)}

        {completedCourses.map(course=><article className="trail-course-card completed" key={course.key}>
          <div className="trail-course-icon"><FiCheck/></div>
          <div className="trail-course-copy">
            <div className="trail-course-title">
              <strong>{course.name}</strong>
              <span>Concluído</span>
            </div>
            <p>{course.description||'Curso concluído e validado na sua Trilha.'}</p>
            <div className="trail-course-links">
              {(course.links||[]).map(link=><a href={link.url} target="_blank" rel="noreferrer" key={link.url+link.title}>
                <FiBookOpen/>
                <div><strong>{link.title}</strong><span>{providerLabel(link.url)}</span></div>
                <FiExternalLink/>
              </a>)}
            </div>
          </div>
        </article>)}
      </div>
    </section>}

    <section className="trail-main-grid">
      <article className="panel trail-requirements-card">
        <div className="panel-head">
          <div><p className="eyebrow">PRÓXIMO PASSO</p><h2>Requisitos para evoluir</h2><p className="panel-description">Conclua os requisitos abaixo para ficar pronto para a próxima movimentação.</p></div>
          <span className="trail-requirement-count">{dev.progress.completed}/{dev.progress.required}</span>
        </div>

        <div className="trail-requirements">
          {dev.requirements.map(requirement=>{
            const status=requirementStatus(requirement);
            return <div className={'trail-requirement '+status.tone} key={requirement.key}>
              <div className="trail-requirement-check">{requirement.met?<FiCheck/>:requirement.status==='AWAITING_REVIEW'?<FiClock/>:<span/>}</div>
              <div className="trail-requirement-main">
                <div className="trail-requirement-title"><strong>{requirement.name}</strong><em>{status.label}</em></div>
                <p>{requirement.requiredMonths!=null
                  ? String(requirement.currentMonths||0)+' de '+String(requirement.requiredMonths)+' meses'
                  : requirement.description||requirement.notes||requirement.type}</p>
                <div className="trail-requirement-meta">
                  {requirement.submittedAt&&<span>Enviado em {new Date(requirement.submittedAt).toLocaleDateString('pt-BR')}</span>}
                  {requirement.evaluator&&requirement.evaluatedAt&&<span>Avaliado por {requirement.evaluator.name}</span>}
                  {requirement.evidenceUrl&&<a href={requirement.evidenceUrl} target="_blank" rel="noreferrer"><FiExternalLink/> Ver evidência</a>}
                </div>
              </div>
              {requirement.source==='QUALIFICATION'&&requirement.status!=='COMPLETED'&&<button className="trail-evidence-button" onClick={()=>openSubmission(requirement)}><FiSend/>{requirement.status==='AWAITING_REVIEW'?'Atualizar':'Enviar evidência'}</button>}
            </div>
          })}
          {!dev.requirements.length&&<div className="empty-state compact"><b>Nenhum requisito pendente</b><span>{dev.careerComplete?'Você chegou ao último step da trilha.':'Seu próximo step ainda não possui requisitos cadastrados.'}</span></div>}
        </div>
      </article>

      <aside className="trail-side-stack">
        <article className={dev.eligibleForPromotion?'trail-next-action ready':'trail-next-action'}>
          <span className="trail-next-icon">{dev.eligibleForPromotion?<FiCheck/>:<FiTrendingUp/>}</span>
          <small>{dev.eligibleForPromotion?'MARCO CONCLUÍDO':'CONTINUE EVOLUINDO'}</small>
          <h3>{dev.eligibleForPromotion?'Você está pronto para avançar':'Faltam '+missing+' requisito(s)'}</h3>
          <p>{dev.eligibleForPromotion?'Seu gestor já pode avaliar sua progressão para o próximo step.':'Complete os itens pendentes e envie evidências quando necessário.'}</p>
        </article>

        <article className="panel trail-journey-card">
          <div className="panel-head compact"><div><p className="eyebrow">JORNADA</p><h2>Datas importantes</h2></div></div>
          <div className="trail-journey-list">
            <div><span><FiCalendar/>Admissão</span><strong>{new Date(profile.hiredAt).toLocaleDateString('pt-BR')}</strong></div>
            <div><span><FiBriefcase/>Step atual desde</span><strong>{profile.currentRoleStepStartedAt?new Date(profile.currentRoleStepStartedAt).toLocaleDateString('pt-BR'):'Não informado'}</strong></div>
            <div><span><FiTrendingUp/>Experiência desde</span><strong>{profile.professionalSince?new Date(profile.professionalSince).toLocaleDateString('pt-BR'):'Não informado'}</strong></div>
          </div>
        </article>
      </aside>
    </section>

    <section className="panel trail-history-card">
      <div className="panel-head"><div><p className="eyebrow">MINHA EVOLUÇÃO</p><h2>Histórico de carreira</h2><p className="panel-description">Os principais marcos da sua trajetória dentro da empresa.</p></div></div>
      {profile.careerHistory.length
        ? <div className="trail-history">{profile.careerHistory.map((item,index)=><div className="trail-history-item" key={item.id}>
            <div className="trail-history-rail"><span className={index===0?'active':''}/>{index<profile.careerHistory.length-1&&<i/>}</div>
            <div className="trail-history-main">
              <div><strong>{item.role.name}</strong><span>{item.roleStep.label}</span></div>
              <small>{new Date(item.startedAt).toLocaleDateString('pt-BR')}{item.endedAt?' até '+new Date(item.endedAt).toLocaleDateString('pt-BR'):' · Atual'}</small>
              {item.reason&&<p>{item.reason}</p>}
            </div>
            <b>R$ {Number(item.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</b>
          </div>)}</div>
        : <div className="empty-state compact"><span>Nenhuma movimentação registrada.</span></div>}
    </section>

    {submissionOpen&&submissionRequirement&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">ENVIAR PARA AVALIAÇÃO</p><h2>{submissionRequirement.name}</h2><p>Compartilhe uma evidência para seu gestor avaliar esta qualificação.</p></div><button className="modal-close" onClick={()=>setSubmissionOpen(false)} aria-label="Fechar"><FiX/></button></div>
      <div className="submission-explainer"><span>1</span><div><strong>Envie sua evidência</strong><small>Certificado, documento, link de atividade ou outro material que demonstre a habilidade.</small></div><b>→</b><span>2</span><div><strong>Seu gestor avalia</strong><small>Somente o gestor pode concluir ou rejeitar o requisito.</small></div></div>
      <div className="form-grid two evaluation-form">
        <label className="span-2">Link da evidência<input type="url" value={submissionEvidence} onChange={e=>setSubmissionEvidence(e.target.value)} placeholder="https://..."/></label>
        <label className="span-2">Comentário para o gestor<textarea value={submissionNotes} onChange={e=>setSubmissionNotes(e.target.value)} placeholder="Ex.: Concluí o treinamento e apliquei o conhecimento no atendimento do chamado #1234."/></label>
      </div>
      <div className="submission-note"><strong>Ao enviar</strong><span>O requisito ficará como “Aguardando avaliação” e ainda não contará como concluído no seu progresso.</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setSubmissionOpen(false)}>Cancelar</button><button className="primary-action action-with-icon" disabled={submitting||!submissionEvidence.trim()} onClick={submitQualification}><FiSend/>{submitting?'Enviando...':'Enviar para avaliação'}</button></div>
    </div></div>}
  </AppLayout>;
}
