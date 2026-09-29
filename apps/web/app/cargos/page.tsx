'use client';
import { useEffect,useMemo,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';
import { useSessionUser } from '../../lib/use-session';
import { FiBriefcase,FiChevronDown,FiPlus,FiSearch,FiUsers,FiX } from 'react-icons/fi';

type Team={id:string;name:string};
type Qualification={id:string;name:string;type:string;description?:string;team?:Team|null};
type StepForm={code:string;label:string;order:number;salary:string;minTenureMonths:string;minExperienceMonths:string;minMonthsInCurrentStep:string;qualificationIds:string[]};
type RoleStep={id:string;code:string;label:string;salary:string;order:number;requirements:{qualificationId:string;required:boolean;qualification:Qualification}[]};
type Role={id:string;name:string;description?:string;team:{id:string;name:string};steps:RoleStep[];_count:{users:number}};
type StepRequirementResponse={id:string;requirements:{qualificationId:string;required:boolean;notes?:string;qualification:Qualification}[]};

const stepOptions=['BASE','STEP_1','STEP_2','STEP_3','STEP_4'];
const typeLabel:Record<string,string>={COURSE:'Curso',KNOWLEDGE:'Conhecimento',TENURE:'Tempo de casa',EXPERIENCE:'Experiência'};

export default function Cargos(){
  const sessionUser=useSessionUser();
  const [data,setData]=useState<Role[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',description:'',teamId:''});
  const [steps,setSteps]=useState<StepForm[]>([{code:'BASE',label:'Base',order:0,salary:'',minTenureMonths:'0',minExperienceMonths:'0',minMonthsInCurrentStep:'0',qualificationIds:[]}]);
  const [createQualifications,setCreateQualifications]=useState<Qualification[]>([]);
  const [createQualificationQuery,setCreateQualificationQuery]=useState('');

  const [requirementsRole,setRequirementsRole]=useState<Role|null>(null);
  const [selectedStepId,setSelectedStepId]=useState('');
  const [qualifications,setQualifications]=useState<Qualification[]>([]);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [loadingRequirements,setLoadingRequirements]=useState(false);
  const [savingRequirements,setSavingRequirements]=useState(false);
  const [qualificationQuery,setQualificationQuery]=useState('');
  const [expandedStepId,setExpandedStepId]=useState('');
  const [teamFilter,setTeamFilter]=useState('');
  const [roleQuery,setRoleQuery]=useState('');

  async function load(){
    try{
      const [roles,teamList]=await Promise.all([api<Role[]>('/roles'),api<Team[]>('/teams')]);
      setData(roles);setTeams(teamList);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar cargos')}
  }
  useEffect(()=>{load()},[]);

  function addStep(){
    const next=stepOptions.find(code=>!steps.some(s=>s.code===code));
    if(!next)return;
    const order=steps.length;
    setSteps([...steps,{code:next,label:next.replace('STEP_','Step ').replace('BASE','Base'),order,salary:'',minTenureMonths:'0',minExperienceMonths:'0',minMonthsInCurrentStep:'0',qualificationIds:[]}]);
  }
type StepScalarKey=Exclude<keyof StepForm,'qualificationIds'>;
  function updateStep(index:number,key:StepScalarKey,value:string|number){setSteps(steps.map((s,i)=>i===index?{...s,[key]:value}:s))}
  function removeStep(index:number){if(index===0)return;setSteps(steps.filter((_,i)=>i!==index).map((s,i)=>({...s,order:i})))}
  function toggleCreateQualification(index:number,id:string){
    setSteps(current=>current.map((step,i)=>i===index?{...step,qualificationIds:step.qualificationIds.includes(id)?step.qualificationIds.filter(x=>x!==id):[...step.qualificationIds,id]}:step));
  }
  async function changeCreateTeam(teamId:string){
    setForm({...form,teamId});
    setSteps(current=>current.map(step=>({...step,qualificationIds:[]})));
    if(!teamId){setCreateQualifications([]);return}
    try{setCreateQualifications(await api<Qualification[]>('/qualifications?teamId='+teamId))}
    catch(e){setError(e instanceof Error?e.message:'Erro ao carregar qualificações do time')}
  }

  async function create(){
    setSaving(true);setError('');
    try{
      await api('/roles',{method:'POST',body:JSON.stringify({
        name:form.name,description:form.description||undefined,teamId:form.teamId,
        steps:steps.map((s,i)=>({code:s.code,label:s.label,order:i,salary:Number(s.salary),minTenureMonths:s.minTenureMonths===''?undefined:Number(s.minTenureMonths),minExperienceMonths:s.minExperienceMonths===''?undefined:Number(s.minExperienceMonths),minMonthsInCurrentStep:s.minMonthsInCurrentStep===''?undefined:Number(s.minMonthsInCurrentStep),requirements:s.qualificationIds.map(qualificationId=>({qualificationId}))}))
      })});
      setOpen(false);setForm({name:'',description:'',teamId:''});
      setSteps([{code:'BASE',label:'Base',order:0,salary:'',minTenureMonths:'0',minExperienceMonths:'0',minMonthsInCurrentStep:'0',qualificationIds:[]}]);setCreateQualifications([]);setCreateQualificationQuery('');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar cargo')}
    finally{setSaving(false)}
  }

  async function openRequirements(role:Role){
    setRequirementsRole(role);setQualificationQuery('');
    const first=role.steps[0];
    if(!first)return;
    setSelectedStepId(first.id);
    setLoadingRequirements(true);
    try{
      const [qs,req]=await Promise.all([
        api<Qualification[]>('/qualifications?teamId='+role.team.id),
        api<StepRequirementResponse>('/roles/steps/'+first.id+'/requirements')
      ]);
      setQualifications(qs);
      setSelectedIds(req.requirements.map(r=>r.qualificationId));
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar requisitos')}
    finally{setLoadingRequirements(false)}
  }

  async function changeStep(stepId:string){
    setSelectedStepId(stepId);setLoadingRequirements(true);
    try{
      const req=await api<StepRequirementResponse>('/roles/steps/'+stepId+'/requirements');
      setSelectedIds(req.requirements.map(r=>r.qualificationId));
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar requisitos')}
    finally{setLoadingRequirements(false)}
  }

  function toggleQualification(id:string){
    setSelectedIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  }

  async function saveRequirements(){
    setSavingRequirements(true);setError('');
    try{
      await api('/roles/steps/'+selectedStepId+'/requirements',{method:'PUT',body:JSON.stringify({requirements:selectedIds.map(qualificationId=>({qualificationId,required:true}))})});
      setRequirementsRole(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar requisitos')}
    finally{setSavingRequirements(false)}
  }

  const filteredQualifications=qualifications.filter(q=>[q.name,q.description,typeLabel[q.type]].some(v=>v?.toLowerCase().includes(qualificationQuery.toLowerCase())));
  const visibleRoles=useMemo(()=>data.filter(role=>{
    const matchesTeam=!teamFilter||role.team.id===teamFilter;
    const q=roleQuery.trim().toLowerCase();
    const matchesQuery=!q||[role.name,role.description,role.team.name].some(value=>value?.toLowerCase().includes(q));
    return matchesTeam&&matchesQuery;
  }),[data,teamFilter,roleQuery]);

  const groupedRoles=useMemo(()=>teams.map(team=>({
    team,
    roles:visibleRoles.filter(role=>role.team.id===team.id),
  })).filter(group=>group.roles.length>0),[teams,visibleRoles]);

  return <AppLayout title="Cargos e steps" description="Configure trilhas de carreira e as qualificações exigidas em cada etapa." action={sessionUser?.systemRole==='ADMIN'?<button className="primary-action action-with-icon" onClick={()=>setOpen(true)}><FiPlus/> Novo cargo</button>:undefined}>
    {error&&<div className="form-error">{error}</div>}

    <section className="roles-toolbar">
      <div className="roles-toolbar-copy">
        <strong>{visibleRoles.length}</strong>
        <span>cargo(s) exibido(s)</span>
      </div>
      <label className="search-field roles-search"><FiSearch/><input value={roleQuery} onChange={e=>setRoleQuery(e.target.value)} placeholder="Buscar cargo, descrição ou time..."/></label>
      <select className="roles-team-select" value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}>
        <option value="">Todos os times</option>
        {teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </section>

    <div className="roles-team-tabs">
      <button className={!teamFilter?'active':''} onClick={()=>setTeamFilter('')}>Todos <span>{data.length}</span></button>
      {teams.map(team=>{
        const count=data.filter(role=>role.team.id===team.id).length;
        return <button key={team.id} className={teamFilter===team.id?'active':''} onClick={()=>setTeamFilter(team.id)}>{team.name}<span>{count}</span></button>
      })}
    </div>

    <section className="roles-by-team">
      {groupedRoles.map(group=><section className="role-team-section" key={group.team.id}>
        <header className="role-team-header">
          <div className="role-team-icon"><FiUsers/></div>
          <div className="role-team-heading"><p className="eyebrow">TIME</p><h2>{group.team.name}</h2><span>{group.roles.length} cargo(s) estruturado(s)</span></div>
          <div className="role-team-metrics">
            <div><FiBriefcase/><strong>{group.roles.length}</strong><span>Cargos</span></div>
            <div><FiUsers/><strong>{group.roles.reduce((sum,role)=>sum+role._count.users,0)}</strong><span>Colaboradores</span></div>
          </div>
        </header>

        <div className="roles-list">{group.roles.map(r=><article className="role-card" key={r.id}>
      <div className="role-title"><div><p className="eyebrow">{r.team.name}</p><h2>{r.name}</h2><span>{r.description||r._count.users+' colaborador(es)'}</span></div>{sessionUser?.systemRole==='ADMIN'&&<button className="secondary-button" onClick={()=>openRequirements(r)}>Configurar qualificações</button>}</div>
      <div className="role-summary"><span>{r.steps.length} step(s)</span><span>{r.steps.reduce((sum,s)=>sum+s.requirements.length,0)} requisito(s) configurado(s)</span><span>{r._count.users} colaborador(es)</span></div>
      <div className="step-cards">{r.steps.map((s,i)=>{
        const expanded=expandedStepId===s.id;
        return <div className={expanded?'step-card expanded':'step-card'} key={s.id}>
          <button className="step-card-main" onClick={()=>setExpandedStepId(expanded?'':s.id)}>
            <div className="step-card-index">{i+1}</div>
            <div className="step-card-title"><small>{s.code}</small><strong>{s.label}</strong></div>
            <div className="step-card-salary"><small>SALÁRIO</small><strong>R$ {Number(s.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>
            <div className="step-card-count"><b>{s.requirements.length}</b><span>qualificações</span></div>
            <div className={'step-card-chevron '+(expanded?'expanded':'')}><FiChevronDown/></div>
          </button>
          {expanded&&<div className="step-card-details">
            <div className="step-detail-head"><div><p className="eyebrow">QUALIFICAÇÕES REQUERIDAS</p><h3>{s.label}</h3></div>{sessionUser?.systemRole==='ADMIN'&&<button className="text-button" onClick={()=>openRequirements(r)}>Editar requisitos →</button>}</div>
            {s.requirements.length?<div className="requirement-tags">{s.requirements.map(req=><div className="requirement-tag" key={req.qualificationId}><span className="requirement-tag-icon">✓</span><div><strong>{req.qualification.name}</strong><small>{typeLabel[req.qualification.type]||req.qualification.type}</small></div></div>)}</div>:<div className="empty-step-requirements"><span>○</span><div><strong>Nenhuma qualificação vinculada</strong><small>Configure o que é necessário para concluir este step.</small></div></div>}
          </div>}
        </div>
      })}</div>
    </article>)}</div>
      </section>)}
    </section>

    {!groupedRoles.length&&!error&&<div className="empty-state modern"><div className="empty-icon"><FiBriefcase/></div><b>Nenhum cargo encontrado</b><span>{data.length?'Ajuste o time selecionado ou o termo da busca.':'Crie cargos e seus steps para visualizar as trilhas de carreira.'}</span></div>}

    {open&&<div className="modal-backdrop"><div className="modal modal-xl">
      <div className="modal-head"><div><p className="eyebrow">CARREIRA</p><h2>Novo cargo</h2><p>Configure o cargo e a trilha salarial por steps.</p></div><button className="modal-close" onClick={()=>setOpen(false)} aria-label="Fechar"><FiX/></button></div>
      <div className="form-grid two">
        <label>Nome do cargo<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Estagiário"/></label>
        <label>Time<select value={form.teamId} onChange={e=>changeCreateTeam(e.target.value)}><option value="">Selecione...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Responsabilidades e objetivo do cargo"/></label>
      </div>
      <div className="steps-editor-head"><div><p className="eyebrow">STEPS</p><h3>Progressão do cargo</h3></div><button className="secondary-button" onClick={addStep} disabled={steps.length===5}>+ Adicionar step</button></div>
      {form.teamId&&<div className="create-qualification-search"><input value={createQualificationQuery} onChange={e=>setCreateQualificationQuery(e.target.value)} placeholder="Buscar qualificação para adicionar aos steps..."/><span>{createQualifications.length} disponíveis no time</span></div>}
      <div className="steps-editor">{steps.map((s,i)=><div className="step-editor step-editor-rich" key={s.code}>
        <div className="step-editor-index">{i+1}</div>
        <div className="step-editor-content">
          <div className="step-editor-fields">
            <label>Código<select value={s.code} onChange={e=>updateStep(i,'code',e.target.value)} disabled={i===0}>{stepOptions.map(code=><option key={code} value={code} disabled={steps.some((x,j)=>j!==i&&x.code===code)}>{code}</option>)}</select></label>
            <label>Rótulo<input value={s.label} onChange={e=>updateStep(i,'label',e.target.value)}/></label>
            <label>Salário<input type="number" min="0" step="0.01" value={s.salary} onChange={e=>updateStep(i,'salary',e.target.value)} placeholder="0,00"/></label>
            <label>Tempo empresa (meses)<input type="number" min="0" value={s.minTenureMonths} onChange={e=>updateStep(i,'minTenureMonths',e.target.value)}/></label>
            <label>Experiência (meses)<input type="number" min="0" value={s.minExperienceMonths} onChange={e=>updateStep(i,'minExperienceMonths',e.target.value)}/></label><label>Tempo no nível anterior (meses)<input type="number" min="0" value={s.minMonthsInCurrentStep} onChange={e=>updateStep(i,'minMonthsInCurrentStep',e.target.value)}/></label>
          </div>
          <div className="step-inline-requirements">
            <div className="inline-requirements-head"><span>QUALIFICAÇÕES REQUERIDAS</span><b>{s.qualificationIds.length} selecionada(s)</b></div>
            {!form.teamId?<div className="inline-requirements-empty">Selecione um time para carregar as qualificações disponíveis.</div>:
              <div className="inline-qualification-grid">
                {createQualifications.filter(q=>[q.name,q.description,typeLabel[q.type]].some(v=>v?.toLowerCase().includes(createQualificationQuery.toLowerCase()))).map(q=><label className={s.qualificationIds.includes(q.id)?'inline-qualification selected':'inline-qualification'} key={q.id}>
                  <input type="checkbox" checked={s.qualificationIds.includes(q.id)} onChange={()=>toggleCreateQualification(i,q.id)}/>
                  <span>{s.qualificationIds.includes(q.id)?'✓':''}</span>
                  <div><strong>{q.name}</strong><small>{typeLabel[q.type]||q.type}</small></div>
                </label>)}
                {!createQualifications.length&&<div className="inline-requirements-empty">Este time ainda não possui qualificações cadastradas.</div>}
              </div>}
          </div>
        </div>
        {i>0&&<button className="remove-step" onClick={()=>removeStep(i)}>×</button>}
      </div>)}</div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!form.name||!form.teamId||steps.some(s=>!s.label||!s.salary)} onClick={create}>{saving?'Salvando...':'Criar cargo'}</button></div>
    </div></div>}

    {requirementsRole&&<div className="modal-backdrop"><div className="modal modal-xl requirements-modal">
      <div className="modal-head"><div><p className="eyebrow">{requirementsRole.team.name}</p><h2>{requirementsRole.name} · Qualificações requeridas</h2><p>Selecione o step e marque tudo o que o colaborador precisa concluir para avançar.</p></div><button className="modal-close" onClick={()=>setRequirementsRole(null)} aria-label="Fechar"><FiX/></button></div>
      <div className="requirements-layout">
        <aside className="step-selector">
          <span className="selector-title">NÍVEIS / STEPS</span>
          {requirementsRole.steps.map((s,i)=><button key={s.id} className={selectedStepId===s.id?'step-select active':'step-select'} onClick={()=>changeStep(s.id)}><b>{i+1}</b><span>{s.label}</span></button>)}
        </aside>
        <section className="qualification-selector">
          <div className="qualification-selector-head"><div><span className="selector-title">QUALIFICAÇÕES DO TIME</span><strong>{selectedIds.length} selecionada(s)</strong></div><input value={qualificationQuery} onChange={e=>setQualificationQuery(e.target.value)} placeholder="Buscar qualificação..."/></div>
          {loadingRequirements?<div className="empty-state compact"><span>Carregando requisitos...</span></div>:<div className="qualification-check-list">
            {filteredQualifications.map(q=><label className={selectedIds.includes(q.id)?'qualification-check selected':'qualification-check'} key={q.id}>
              <input type="checkbox" checked={selectedIds.includes(q.id)} onChange={()=>toggleQualification(q.id)}/>
              <span className="check-ui">{selectedIds.includes(q.id)?'✓':''}</span>
              <div><strong>{q.name}</strong><small>{typeLabel[q.type]||q.type}{q.description?' · '+q.description:''}</small></div>
            </label>)}
            {!filteredQualifications.length&&<div className="empty-state compact"><b>Nenhuma qualificação neste time</b><span>Cadastre primeiro as qualificações do time {requirementsRole.team.name}.</span></div>}
          </div>}
        </section>
      </div>
      <div className="requirements-summary"><span>As qualificações selecionadas serão exigidas para concluir este step.</span><div><button className="secondary-button" onClick={()=>setRequirementsRole(null)}>Cancelar</button><button className="primary-action" disabled={savingRequirements||loadingRequirements} onClick={saveRequirements}>{savingRequirements?'Salvando...':'Salvar requisitos'}</button></div></div>
    </div></div>}
  </AppLayout>
}