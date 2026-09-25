'use client';
import { useEffect,useMemo,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Q={id:string;name:string;type:string;description?:string;referenceUrl?:string;active:boolean;_count:{roleStepRequirements:number;userQualifications:number}};
const labels:Record<string,string>={COURSE:'Curso',KNOWLEDGE:'Conhecimento',TENURE:'Tempo de casa',EXPERIENCE:'Experiência'};

export default function Qualificacoes(){
  const [data,setData]=useState<Q[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',type:'KNOWLEDGE',description:'',referenceUrl:''});

  async function load(){
    try{setData(await api<Q[]>('/qualifications'));setError('')}
    catch(e){setError(e instanceof Error?e.message:'Erro ao carregar qualificações')}
  }
  useEffect(()=>{load()},[]);
  const filtered=useMemo(()=>data.filter(q=>[q.name,q.description,labels[q.type]].some(v=>v?.toLowerCase().includes(query.toLowerCase()))),[data,query]);

  async function create(){
    setSaving(true);setError('');
    try{
      await api('/qualifications',{method:'POST',body:JSON.stringify({
        name:form.name,type:form.type,description:form.description||undefined,referenceUrl:form.referenceUrl||undefined
      })});
      setForm({name:'',type:'KNOWLEDGE',description:'',referenceUrl:''});setOpen(false);await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar qualificação')}
    finally{setSaving(false)}
  }

  return <AppLayout title="Qualificações" description="Competências e critérios usados nos planos de desenvolvimento.">
    {error&&<div className="form-error">{error}</div>}
    <div className="table-panel">
      <div className="table-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar qualificação..."/><button className="primary-action" onClick={()=>setOpen(true)}>+ Nova qualificação</button></div>
      <div className="data-table">
        <div className="table-row table-head"><span>Qualificação</span><span>Tipo</span><span>Em steps</span><span>Colaboradores</span><span>Status</span></div>
        {filtered.map(q=><div className="table-row" key={q.id}><span><b>{q.name}</b><small>{q.description||'Sem descrição'}</small></span><span><em className="type-pill">{labels[q.type]||q.type}</em></span><span>{q._count.roleStepRequirements}</span><span>{q._count.userQualifications}</span><span><em className={q.active?'status-pill':'status-pill muted'}>{q.active?'Ativa':'Inativa'}</em></span></div>)}
      </div>
      {!filtered.length&&!error&&<div className="empty-state"><b>Nenhuma qualificação encontrada</b><span>Cadastre cursos, conhecimentos e critérios para os steps.</span></div>}
    </div>

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">REQUISITOS</p><h2>Nova qualificação</h2><p>Crie um item reutilizável nos planos de carreira.</p></div><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="form-grid two">
        <label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Git e GitHub"/></label>
        <label>Tipo<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="COURSE">Curso</option><option value="KNOWLEDGE">Conhecimento</option><option value="TENURE">Tempo de casa</option><option value="EXPERIENCE">Experiência</option></select></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descreva o que deve ser comprovado"/></label>
        <label className="span-2">URL de referência<input type="url" value={form.referenceUrl} onChange={e=>setForm({...form,referenceUrl:e.target.value})} placeholder="https://..."/></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!form.name} onClick={create}>{saving?'Salvando...':'Criar qualificação'}</button></div>
    </div></div>}
  </AppLayout>
}