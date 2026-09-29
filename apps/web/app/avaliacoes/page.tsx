'use client';
import { useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';
import { useSessionUser } from '../../lib/use-session';

type Review={
  id:string;
  userId:string;
  qualificationId:string;
  status:string;
  evidenceUrl?:string|null;
  submissionNotes?:string|null;
  submittedAt?:string|null;
  qualification:{id:string;name:string;type:string;description?:string|null};
  user:{
    id:string;name:string;email:string;
    team:{id:string;name:string};
    role?:{id:string;name:string}|null;
    currentRoleStep?:{id:string;label:string;code:string;order:number}|null;
  };
};

const typeLabel:Record<string,string>={COURSE:'Curso',KNOWLEDGE:'Conhecimento',TENURE:'Tempo de casa',EXPERIENCE:'Experiência'};

export default function Avaliacoes(){
  const sessionUser=useSessionUser();
  const [data,setData]=useState<Review[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<Review|null>(null);
  const [status,setStatus]=useState('COMPLETED');
  const [notes,setNotes]=useState('');
  const [evidence,setEvidence]=useState('');
  const [saving,setSaving]=useState(false);

  async function load(){
    try{setData(await api<Review[]>('/users/reviews/pending'));setError('')}
    catch(e){setError(e instanceof Error?e.message:'Erro ao carregar avaliações')}
  }
  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>data.filter(item=>[
    item.user.name,item.user.email,item.user.team.name,item.user.role?.name,item.qualification.name,typeLabel[item.qualification.type]
  ].some(v=>v?.toLowerCase().includes(query.toLowerCase()))),[data,query]);

  function openReview(item:Review){
    setSelected(item);
    setStatus('COMPLETED');
    setNotes('');
    setEvidence(item.evidenceUrl||'');
  }

  async function saveReview(){
    if(!selected)return;
    setSaving(true);setError('');
    try{
      await api('/users/'+selected.userId+'/qualifications/'+selected.qualificationId,{
        method:'PUT',
        body:JSON.stringify({status,evidenceUrl:evidence||undefined,notes:notes||undefined})
      });
      setSelected(null);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar avaliação')}
    finally{setSaving(false)}
  }

  return <AppLayout title="Avaliações pendentes" description="Revise evidências enviadas pelos colaboradores e conclua as qualificações.">
    {error&&<div className="form-error">{error}</div>}
    {sessionUser?.systemRole==='MANAGER'&&<div className="scope-banner"><strong>Seu time</strong><span>Esta fila contém apenas envios de colaboradores do seu time.</span></div>}

    <section className="review-summary">
      <article><small>PENDENTES</small><strong>{data.length}</strong><span>aguardando decisão</span></article>
      <article><small>COLABORADORES</small><strong>{new Set(data.map(i=>i.userId)).size}</strong><span>com envio pendente</span></article>
      <article><small>TIMES</small><strong>{new Set(data.map(i=>i.user.team.id)).size}</strong><span>representados na fila</span></article>
    </section>

    <section className="review-toolbar">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar colaborador, time, cargo ou qualificação..."/>
      <span>{filtered.length} resultado(s)</span>
    </section>

    <section className="review-list">
      {filtered.map(item=>{
        const initials=item.user.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
        return <article className="review-card" key={item.id}>
          <div className="review-person">
            <div className="avatar soft">{initials}</div>
            <div><strong>{item.user.name}</strong><span>{item.user.role?.name||'Sem cargo'} · {item.user.currentRoleStep?.label||'Sem step'}</span><small>{item.user.team.name}</small></div>
          </div>
          <div className="review-qualification"><small>{typeLabel[item.qualification.type]||item.qualification.type}</small><strong>{item.qualification.name}</strong><span>{item.qualification.description||'Sem descrição'}</span></div>
          <div className="review-submission"><small>ENVIADO</small><strong>{item.submittedAt?new Date(item.submittedAt).toLocaleDateString('pt-BR'):'Sem data'}</strong>{item.submissionNotes&&<span>{item.submissionNotes}</span>}</div>
          <div className="review-actions">
            {item.evidenceUrl&&<a href={item.evidenceUrl} target="_blank" rel="noreferrer">Evidência ↗</a>}
            <button className="primary-action" onClick={()=>openReview(item)}>Revisar</button>
            <Link href={'/colaboradores/'+item.userId}>Abrir PDI</Link>
          </div>
        </article>
      })}
      {!filtered.length&&!error&&<div className="empty-state"><b>Nenhuma avaliação pendente</b><span>Quando um colaborador enviar uma evidência, ela aparecerá aqui.</span></div>}
    </section>

    {selected&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">REVISÃO DE EVIDÊNCIA</p><h2>{selected.qualification.name}</h2><p>{selected.user.name} · {selected.user.role?.name||'Sem cargo'}</p></div><button className="modal-close" onClick={()=>setSelected(null)}>×</button></div>

      <div className="submission-review-card"><div><span className="selector-title">ENVIO DO COLABORADOR</span><strong>{selected.submittedAt?'Enviado em '+new Date(selected.submittedAt).toLocaleDateString('pt-BR'):'Data não informada'}</strong>{selected.submissionNotes&&<p>{selected.submissionNotes}</p>}</div>{selected.evidenceUrl&&<a href={selected.evidenceUrl} target="_blank" rel="noreferrer">Abrir evidência ↗</a>}</div>

      <div className="evaluation-status-grid">
        {[
          ['COMPLETED','Concluída','Requisito atendido'],
          ['IN_PROGRESS','Em andamento','Precisa evoluir'],
          ['REJECTED','Rejeitada','Enviar novamente'],
          ['PENDING','Pendente','Voltar para fila inicial']
        ].map(([value,label,caption])=><button key={value} className={status===value?'evaluation-status active':'evaluation-status'} onClick={()=>setStatus(value)}><b>{label}</b><span>{caption}</span></button>)}
      </div>

      <div className="form-grid two evaluation-form">
        <label className="span-2">Evidência<input type="url" value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://..."/></label>
        <label className="span-2">Feedback para o colaborador<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Explique sua avaliação e, se necessário, o que precisa ser revisado."/></label>
      </div>

      {status==='REJECTED'&&<div className="override-note"><strong>Feedback obrigatório</strong><span>Ao rejeitar, informe claramente o que precisa ser corrigido antes de um novo envio.</span></div>}

      <div className="modal-actions"><button className="secondary-button" onClick={()=>setSelected(null)}>Cancelar</button><button className="primary-action" disabled={saving||(status==='REJECTED'&&!notes.trim())} onClick={saveReview}>{saving?'Salvando...':'Concluir avaliação'}</button></div>
    </div></div>}
  </AppLayout>
}
