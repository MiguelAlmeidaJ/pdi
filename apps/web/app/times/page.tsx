'use client';

import { useEffect,useState } from 'react';
import { FiBriefcase,FiPlus,FiUsers,FiX } from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';
import { useSessionUser } from '../../lib/use-session';

type Team={id:string;name:string;slug:string;_count:{users:number;roles:number}};

export default function Times(){
  const sessionUser=useSessionUser();
  const [data,setData]=useState<Team[]>([]);
  const [name,setName]=useState('');
  const [open,setOpen]=useState(false);
  const [error,setError]=useState('');

  async function load(){
    try{setData(await api<Team[]>('/teams'));setError('')}
    catch(e){setError(e instanceof Error?e.message:'Erro ao carregar times')}
  }

  useEffect(()=>{load()},[]);

  async function create(){
    if(!name.trim())return;
    try{
      await api('/teams',{method:'POST',body:JSON.stringify({name})});
      setName('');setOpen(false);await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar time')}
  }

  return <AppLayout
    title="Times"
    description="Organize colaboradores e cargos por equipe."
    action={sessionUser?.systemRole==='ADMIN'?<button className="primary-action action-with-icon" onClick={()=>setOpen(true)}><FiPlus/> Novo time</button>:undefined}
  >
    {error&&<div className="form-error">{error}</div>}

    <section className="team-list-panel">
      <div className="team-list-head">
        <span>Time</span>
        <span>Identificador</span>
        <span>Colaboradores</span>
        <span>Cargos</span>
        <span>Status</span>
      </div>
      <div className="team-list-body">
        {data.map(t=><article className="team-list-row" key={t.id}>
          <div className="team-list-main">
            <div className="entity-symbol compact">{t.name.slice(0,2).toUpperCase()}</div>
            <div><strong>{t.name}</strong><span>Estrutura organizacional</span></div>
          </div>
          <div className="team-list-slug">{t.slug}</div>
          <div className="team-list-metric"><FiUsers/><strong>{t._count.users}</strong><span>pessoa(s)</span></div>
          <div className="team-list-metric"><FiBriefcase/><strong>{t._count.roles}</strong><span>cargo(s)</span></div>
          <div><span className="status-pill">Ativo</span></div>
        </article>)}
      </div>
    </section>

    {!data.length&&!error&&<div className="empty-state modern"><div className="empty-icon"><FiUsers/></div><b>Nenhum time cadastrado</b><span>Crie o primeiro time para começar a estruturar o PDI.</span></div>}

    {open&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><p className="eyebrow">ESTRUTURA</p><h2>Novo time</h2><p>Crie uma unidade para organizar cargos e colaboradores.</p></div><button className="modal-close" onClick={()=>setOpen(false)} aria-label="Fechar"><FiX/></button></div>
      <label>Nome do time<input value={name} onChange={e=>setName(e.target.value)} autoFocus placeholder="Ex.: Tecnologia"/></label>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action action-with-icon" onClick={create}><FiPlus/> Criar time</button></div>
    </div></div>}
  </AppLayout>
}
