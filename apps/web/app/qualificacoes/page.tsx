'use client';
import { useEffect,useMemo,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';
import { useSessionUser } from '../../lib/use-session';
import { FiEdit3,FiLink,FiPlus,FiSearch,FiTrash2,FiX } from 'react-icons/fi';

type Team={id:string;name:string};
type QualificationLink={id?:string;title:string;url:string;order?:number};
type Q={id:string;name:string;type:string;description?:string;active:boolean;team?:Team|null;links:QualificationLink[];_count:{roleStepRequirements:number;userQualifications:number}};
const labels:Record<string,string>={COURSE:'Curso',KNOWLEDGE:'Conhecimento',TENURE:'Tempo de casa',EXPERIENCE:'Experiência'};

export default function Qualificacoes(){
  const sessionUser=useSessionUser();
  const [data,setData]=useState<Q[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [teamId,setTeamId]=useState('');
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<Q|null>(null);
  const [form,setForm]=useState({name:'',type:'KNOWLEDGE',description:'',teamId:'',active:true,links:[{title:'',url:''}] as QualificationLink[]});

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

  function cleanLinks(){
    return form.links
      .filter(link=>link.title.trim()||link.url.trim())
      .map(link=>({title:link.title.trim(),url:link.url.trim()}));
  }

  async function save(){
    setSaving(true);setError('');
    try{
      const payload={
        name:form.name,
        type:form.type,
        description:form.description||undefined,
        active:form.active,
        links:cleanLinks(),
        ...(editing?{}:{teamId:form.teamId}),
      };
      await api(editing?'/qualifications/'+editing.id:'/qualifications',{
        method:editing?'PATCH':'POST',
        body:JSON.stringify(payload)
      });
      setForm({name:'',type:'KNOWLEDGE',description:'',teamId:teamId||'',active:true,links:[{title:'',url:''}]});
      setEditing(null);setOpen(false);await load();
    }catch(e){setError(e instanceof Error?e.message:(editing?'Erro ao editar qualificação':'Erro ao criar qualificação'))}
    finally{setSaving(false)}
  }

  function openCreate(){
    const ownTeamId=sessionUser?.systemRole==='MANAGER'?(teams[0]?.id||''):(teamId||'');
    setEditing(null);
    setForm({name:'',type:'KNOWLEDGE',description:'',teamId:ownTeamId,active:true,links:[{title:'',url:''}]});
    setOpen(true);
  }

  function openEdit(qualification:Q){
    setEditing(qualification);
    setForm({
      name:qualification.name,
      type:qualification.type,
      description:qualification.description||'',
      teamId:qualification.team?.id||'',
      active:qualification.active,
      links:qualification.links.length?qualification.links.map(link=>({title:link.title,url:link.url})):[{title:'',url:''}],
    });
    setOpen(true);
  }

  function updateLink(index:number,key:'title'|'url',value:string){
    setForm(current=>({...current,links:current.links.map((link,i)=>i===index?{...link,[key]:value}:link)}));
  }

  function addLink(){
    setForm(current=>({...current,links:[...current.links,{title:'',url:''}]}));
  }

  function removeLink(index:number){
    setForm(current=>({...current,links:current.links.filter((_,i)=>i!==index)}));
  }

  return <AppLayout
    title="Qualificações"
    description="Competências organizadas por time e usadas nos requisitos dos cargos."
    action={<button className="primary-action action-with-icon" onClick={openCreate}><FiPlus/> Nova qualificação</button>}
  >
    {error&&<div className="form-error">{error}</div>}

    <div className="qualifications-topbar">
      <div className="team-filter">
        <button className={!teamId?'filter-chip active':'filter-chip'} onClick={()=>setTeamId('')}>Todos os times</button>
        {teams.map(t=><button key={t.id} className={teamId===t.id?'filter-chip active':'filter-chip'} onClick={()=>setTeamId(t.id)}>{t.name}</button>)}
      </div>

    </div>

    <div className="table-panel">
      <div className="table-toolbar"><label className="search-field"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar qualificação..."/></label></div>
      <div className="data-table">
        <div className="table-row qualifications-row table-head"><span>Qualificação</span><span>Time</span><span>Tipo</span><span>Links</span><span>Em steps</span><span>Colaboradores</span><span>Status</span><span></span></div>
        {filtered.map(q=><div className="table-row qualifications-row" key={q.id}>
          <span><b>{q.name}</b><small>{q.description||'Sem descrição'}</small></span>
          <span>{q.team?.name||'Sem time'}</span>
          <span><em className="type-pill">{labels[q.type]||q.type}</em></span>
          <span className="qualification-links-count"><FiLink/><b>{q.links.length}</b></span>
          <span>{q._count.roleStepRequirements}</span><span>{q._count.userQualifications}</span>
          <span><em className={q.active?'status-pill':'status-pill muted'}>{q.active?'Ativa':'Inativa'}</em></span>
          <span><button className="icon-action-button" onClick={()=>openEdit(q)} title="Editar qualificação"><FiEdit3/></button></span>
        </div>)}
      </div>
      {!filtered.length&&!error&&<div className="empty-state"><b>Nenhuma qualificação encontrada</b><span>Cadastre qualificações específicas para este time.</span></div>}
    </div>

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">REQUISITOS</p><h2>{editing?'Editar qualificação':'Nova qualificação'}</h2><p>{editing?'Atualize os dados e materiais de referência desta qualificação.':'Cadastre uma qualificação vinculada ao time correto.'}</p></div><button className="modal-close" onClick={()=>{setOpen(false);setEditing(null)}} aria-label="Fechar"><FiX/></button></div>
      <div className="form-grid two">
        <label>Time<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})} disabled={!!editing||sessionUser?.systemRole==='MANAGER'}><option value="">Selecione...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>{sessionUser?.systemRole==='MANAGER'&&<small className="field-help">A qualificação pertence ao seu time.</small>}</label>
        <label>Tipo<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="COURSE">Curso</option><option value="KNOWLEDGE">Conhecimento</option><option value="TENURE">Tempo de casa</option><option value="EXPERIENCE">Experiência</option></select></label>
        <label className="span-2">Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Atendimento ao cliente"/></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descreva o que deve ser comprovado"/></label>
        {editing&&<label>Status<select value={form.active?'ACTIVE':'INACTIVE'} onChange={e=>setForm({...form,active:e.target.value==='ACTIVE'})}><option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option></select></label>}
      </div>

      <div className="qualification-links-editor">
        <div className="qualification-links-head"><div><p className="eyebrow">MATERIAIS DE REFERÊNCIA</p><h3>Links da qualificação</h3><span>Adicione cursos, manuais, vídeos ou outros materiais com um título identificável.</span></div><button className="secondary-button action-with-icon" onClick={addLink}><FiPlus/> Adicionar link</button></div>
        <div className="qualification-links-list">
          {form.links.map((link,index)=><div className="qualification-link-row" key={index}>
            <div className="qualification-link-index"><FiLink/></div>
            <label>Título<input value={link.title} onChange={e=>updateLink(index,'title',e.target.value)} placeholder="Ex.: Curso oficial Ubiquiti"/></label>
            <label>URL<input type="url" value={link.url} onChange={e=>updateLink(index,'url',e.target.value)} placeholder="https://..."/></label>
            <button className="qualification-link-remove" onClick={()=>removeLink(index)} disabled={form.links.length===1&& !link.title && !link.url} title="Remover link"><FiTrash2/></button>
          </div>)}
        </div>
      </div>

      <div className="modal-actions"><button className="secondary-button" onClick={()=>{setOpen(false);setEditing(null)}}>Cancelar</button><button className="primary-action" disabled={saving||!form.name||!form.teamId||cleanLinks().some(link=>!link.title||!link.url)} onClick={save}>{saving?'Salvando...':editing?'Salvar alterações':'Criar qualificação'}</button></div>
    </div></div>}
  </AppLayout>
}