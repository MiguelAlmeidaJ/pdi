'use client';
import { useEffect,useMemo,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Team={id:string;name:string};
type Q={id:string;name:string;type:string;description?:string;referenceUrl?:string;active:boolean;team?:Team|null;_count:{roleStepRequirements:number;userQualifications:number}};
const labels:Record<string,string>={COURSE:'Curso',KNOWLEDGE:'Conhecimento',TENURE:'Tempo de casa',EXPERIENCE:'Experiência'};

export default function Qualificacoes(){
  const [data,setData]=useState<Q[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [teamId,setTeamId]=useState('');
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',type:'KNOWLEDGE',description:'',referenceUrl:'',teamId:''});

  async function load(){
    try{
      const [teamList,qualificationList]=await Promise.all([
        api<Team[]>('/teams'),
        api<Q[]>('/qualifications'+(teamId?'?teamId='+teamId:''))
      ]);
      setTeams(teamList);setData(qualificationList);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar qualificações')}
  }
  useEffect(()=>{load()},[teamId]);

  const filtered=useMemo(()=>data.filter(q=>[q.name,q.description,labels[q.type],q.team?.name].some(v=>v?.toLowerCase().includes(query.toLowerCase()))),[data,query]);

  async function create(){
    setSaving(true);setError('');
    try{
      await api('/qualifications',{method:'POST',body:JSON.stringify({
        name:form.name,type:form.type,description:form.description||undefined,referenceUrl:form.referenceUrl||undefined,teamId:form.teamId
      })});
      setForm({name:'',type:'KNOWLEDGE',description:'',referenceUrl:'',teamId:teamId||''});setOpen(false);await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar qualificação')}
    finally{setSaving(false)}
  }

  function openCreate(){
    setForm({name:'',type:'KNOWLEDGE',description:'',referenceUrl:'',teamId:teamId||''});
    setOpen(true);
  }

  return <AppLayout title="Qualificações" description="Competências organizadas por time e usadas nos requisitos dos cargos.">
    {error&&<div className="form-error">{error}</div>}

    <div className="qualifications-topbar">
      <div className="team-filter">
        <button className={!teamId?'filter-chip active':'filter-chip'} onClick={()=>setTeamId('')}>Todos os times</button>
        {teams.map(t=><button key={t.id} className={teamId===t.id?'filter-chip active':'filter-chip'} onClick={()=>setTeamId(t.id)}>{t.name}</button>)}
      </div>
      <button className="primary-action" onClick={openCreate}>+ Nova qualificação</button>
    </div>

    <div className="table-panel">
      <div className="table-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar qualificação..."/></div>
      <div className="data-table">
        <div className="table-row qualifications-row table-head"><span>Qualificação</span><span>Time</span><span>Tipo</span><span>Em steps</span><span>Colaboradores</span><span>Status</span></div>
        {filtered.map(q=><div className="table-row qualifications-row" key={q.id}>
          <span><b>{q.name}</b><small>{q.description||'Sem descrição'}</small></span>
          <span>{q.team?.name||'Sem time'}</span>
          <span><em className="type-pill">{labels[q.type]||q.type}</em></span>
          <span>{q._count.roleStepRequirements}</span><span>{q._count.userQualifications}</span>
          <span><em className={q.active?'status-pill':'status-pill muted'}>{q.active?'Ativa':'Inativa'}</em></span>
        </div>)}
      </div>
      {!filtered.length&&!error&&<div className="empty-state"><b>Nenhuma qualificação encontrada</b><span>Cadastre qualificações específicas para este time.</span></div>}
    </div>

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">REQUISITOS</p><h2>Nova qualificação</h2><p>Cadastre uma qualificação vinculada ao time correto.</p></div><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="form-grid two">
        <label>Time<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})}><option value="">Selecione...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Tipo<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="COURSE">Curso</option><option value="KNOWLEDGE">Conhecimento</option><option value="TENURE">Tempo de casa</option><option value="EXPERIENCE">Experiência</option></select></label>
        <label className="span-2">Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Atendimento ao cliente"/></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descreva o que deve ser comprovado"/></label>
        <label className="span-2">URL de referência<input type="url" value={form.referenceUrl} onChange={e=>setForm({...form,referenceUrl:e.target.value})} placeholder="https://..."/></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!form.name||!form.teamId} onClick={create}>{saving?'Salvando...':'Criar qualificação'}</button></div>
    </div></div>}
  </AppLayout>
}