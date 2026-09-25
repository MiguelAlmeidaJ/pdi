'use client';
import { useEffect,useState } from 'react';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Team={id:string;name:string};
type StepForm={code:string;label:string;order:number;salary:string;minTenureMonths:string;minExperienceMonths:string};
type Role={id:string;name:string;description?:string;team:{id:string;name:string};steps:{id:string;code:string;label:string;salary:string;order:number}[];_count:{users:number}};

const stepOptions=['BASE','STEP_1','STEP_2','STEP_3','STEP_4'];

export default function Cargos(){
  const [data,setData]=useState<Role[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',description:'',teamId:''});
  const [steps,setSteps]=useState<StepForm[]>([{code:'BASE',label:'Base',order:0,salary:'',minTenureMonths:'0',minExperienceMonths:'0'}]);

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
    setSteps([...steps,{code:next,label:next.replace('STEP_','Step ').replace('BASE','Base'),order,salary:'',minTenureMonths:'0',minExperienceMonths:'0'}]);
  }
  function updateStep(index:number,key:keyof StepForm,value:string|number){
    setSteps(steps.map((s,i)=>i===index?{...s,[key]:value}:s));
  }
  function removeStep(index:number){
    if(index===0)return;
    setSteps(steps.filter((_,i)=>i!==index).map((s,i)=>({...s,order:i})));
  }

  async function create(){
    setSaving(true);setError('');
    try{
      await api('/roles',{method:'POST',body:JSON.stringify({
        name:form.name,description:form.description||undefined,teamId:form.teamId,
        steps:steps.map((s,i)=>({
          code:s.code,label:s.label,order:i,salary:Number(s.salary),
          minTenureMonths:s.minTenureMonths===''?undefined:Number(s.minTenureMonths),
          minExperienceMonths:s.minExperienceMonths===''?undefined:Number(s.minExperienceMonths)
        }))
      })});
      setOpen(false);setForm({name:'',description:'',teamId:''});
      setSteps([{code:'BASE',label:'Base',order:0,salary:'',minTenureMonths:'0',minExperienceMonths:'0'}]);
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar cargo')}
    finally{setSaving(false)}
  }

  return <AppLayout title="Cargos e steps" description="Visualize caminhos de carreira e faixas salariais." action={<button className="primary-action" onClick={()=>setOpen(true)}>+ Novo cargo</button>}>
    {error&&<div className="form-error">{error}</div>}
    <section className="roles-list">{data.map(r=><article className="role-card" key={r.id}><div className="role-title"><div><p className="eyebrow">{r.team.name}</p><h2>{r.name}</h2><span>{r.description||r._count.users+' colaborador(es)'}</span></div><button className="round-button">•••</button></div><div className="step-track">{r.steps.map((s,i)=><div className="career-step" key={s.id}><div className="step-dot">{i+1}</div><div><small>{s.label}</small><strong>R$ {Number(s.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>{i<r.steps.length-1&&<div className="step-line"/>}</div>)}</div></article>)}</section>
    {!data.length&&!error&&<div className="empty-state"><b>Nenhum cargo cadastrado</b><span>Crie cargos e seus steps para visualizar as trilhas de carreira.</span></div>}

    {open&&<div className="modal-backdrop"><div className="modal modal-xl">
      <div className="modal-head"><div><p className="eyebrow">CARREIRA</p><h2>Novo cargo</h2><p>Configure o cargo e a trilha salarial por steps.</p></div><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="form-grid two">
        <label>Nome do cargo<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Desenvolvedor"/></label>
        <label>Time<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})}><option value="">Selecione...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="span-2">Descrição<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Responsabilidades e objetivo do cargo"/></label>
      </div>

      <div className="steps-editor-head"><div><p className="eyebrow">STEPS</p><h3>Progressão do cargo</h3></div><button className="secondary-button" onClick={addStep} disabled={steps.length===5}>+ Adicionar step</button></div>
      <div className="steps-editor">
        {steps.map((s,i)=><div className="step-editor" key={s.code}>
          <div className="step-editor-index">{i+1}</div>
          <div className="step-editor-fields">
            <label>Código<select value={s.code} onChange={e=>updateStep(i,'code',e.target.value)} disabled={i===0}>{stepOptions.map(code=><option key={code} value={code} disabled={steps.some((x,j)=>j!==i&&x.code===code)}>{code}</option>)}</select></label>
            <label>Rótulo<input value={s.label} onChange={e=>updateStep(i,'label',e.target.value)}/></label>
            <label>Salário<input type="number" min="0" step="0.01" value={s.salary} onChange={e=>updateStep(i,'salary',e.target.value)} placeholder="0,00"/></label>
            <label>Tempo empresa (meses)<input type="number" min="0" value={s.minTenureMonths} onChange={e=>updateStep(i,'minTenureMonths',e.target.value)}/></label>
            <label>Experiência (meses)<input type="number" min="0" value={s.minExperienceMonths} onChange={e=>updateStep(i,'minExperienceMonths',e.target.value)}/></label>
          </div>
          {i>0&&<button className="remove-step" onClick={()=>removeStep(i)}>×</button>}
        </div>)}
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!form.name||!form.teamId||steps.some(s=>!s.label||!s.salary)} onClick={create}>{saving?'Salvando...':'Criar cargo'}</button></div>
    </div></div>}
  </AppLayout>
}