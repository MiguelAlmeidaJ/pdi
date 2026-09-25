'use client';
import { useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Team={id:string;name:string};
type Role={id:string;name:string;team:{id:string;name:string};steps:{id:string;code:string;label:string;salary:string;order:number}[]};
type User={id:string;name:string;email:string;systemRole:string;active:boolean;hiredAt:string;team?:Team|null;role?:{id:string;name:string}|null;currentRoleStep?:{id:string;code:string;label:string;salary:string;order:number}|null};

export default function Colaboradores(){
  const [data,setData]=useState<User[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [roles,setRoles]=useState<Role[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',email:'',password:'',systemRole:'USER',hiredAt:'',professionalSince:'',teamId:'',roleId:'',currentRoleStepId:'',managerId:''});

  async function load(){
    try{
      const [users,teamList,roleList]=await Promise.all([api<User[]>('/users'),api<Team[]>('/teams'),api<Role[]>('/roles')]);
      setData(users);setTeams(teamList);setRoles(roleList);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar dados')}
  }
  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>data.filter(u=>[u.name,u.email,u.team?.name,u.role?.name].some(v=>v?.toLowerCase().includes(query.toLowerCase()))),[data,query]);
  const availableRoles=roles.filter(r=>!form.teamId||r.team.id===form.teamId);
  const selectedRole=roles.find(r=>r.id===form.roleId);
  const managers=data.filter(u=>u.systemRole==='MANAGER'||u.systemRole==='ADMIN');

  function change(name:string,value:string){
    setForm(prev=>({...prev,[name]:value,...(name==='teamId'?{roleId:'',currentRoleStepId:''}:{}),...(name==='roleId'?{currentRoleStepId:''}:{})}));
  }

  async function create(){
    setSaving(true);setError('');
    try{
      await api('/users',{method:'POST',body:JSON.stringify({
        name:form.name,email:form.email,password:form.password,systemRole:form.systemRole,
        hiredAt:form.hiredAt,professionalSince:form.professionalSince||undefined,teamId:form.teamId,
        roleId:form.roleId||undefined,currentRoleStepId:form.currentRoleStepId||undefined,managerId:form.managerId||undefined
      })});
      setOpen(false);
      setForm({name:'',email:'',password:'',systemRole:'USER',hiredAt:'',professionalSince:'',teamId:'',roleId:'',currentRoleStepId:'',managerId:''});
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar colaborador')}
    finally{setSaving(false)}
  }

  return <AppLayout title="Colaboradores" description="Acompanhe posição atual, carreira e desenvolvimento individual." action={<button className="primary-action" onClick={()=>setOpen(true)}>+ Novo colaborador</button>}>
    {error&&<div className="form-error">{error}</div>}
    <section className="people-toolbar"><div><strong>{data.length}</strong><span> colaboradores cadastrados</span></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome, cargo ou time..."/></section>
    <section className="people-cards">
      {filtered.map(user=>{
        const initials=user.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
        return <Link href={'/colaboradores/'+user.id} className="people-card" key={user.id}>
          <div className="people-card-top"><div className="avatar large">{initials}</div><span className={user.active?'status-dot active':'status-dot'}>{user.active?'Ativo':'Inativo'}</span></div>
          <h2>{user.name}</h2><p>{user.email}</p>
          <div className="people-meta"><span>{user.role?.name||'Sem cargo'}</span><i>•</i><span>{user.team?.name||'Sem time'}</span></div>
          <div className="people-step"><div><small>STEP ATUAL</small><strong>{user.currentRoleStep?.label||'Não definido'}</strong></div><div className="salary-mini">{user.currentRoleStep?('R$ '+Number(user.currentRoleStep.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})):'—'}</div></div>
          <div className="people-card-footer"><span>Ver PDI individual</span><b>→</b></div>
        </Link>
      })}
    </section>
    {!filtered.length&&!error&&<div className="empty-state"><b>Nenhum colaborador encontrado</b><span>Ajuste a busca ou cadastre um novo colaborador.</span></div>}

    {open&&<div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">CADASTRO</p><h2>Novo colaborador</h2><p>Defina acesso, time e posição inicial no PDI.</p></div><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div>
      <div className="form-grid two">
        <label>Nome<input value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome completo"/></label>
        <label>E-mail<input type="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="nome@empresa.com"/></label>
        <label>Senha inicial<input type="password" value={form.password} onChange={e=>change('password',e.target.value)} placeholder="Mínimo 8 caracteres"/></label>
        <label>Perfil<select value={form.systemRole} onChange={e=>change('systemRole',e.target.value)}><option value="USER">Colaborador</option><option value="MANAGER">Gerente</option><option value="ADMIN">Administrador</option></select></label>
        <label>Data de admissão<input type="date" value={form.hiredAt} onChange={e=>change('hiredAt',e.target.value)}/></label>
        <label>Experiência profissional desde<input type="date" value={form.professionalSince} onChange={e=>change('professionalSince',e.target.value)}/></label>
        <label>Time<select value={form.teamId} onChange={e=>change('teamId',e.target.value)}><option value="">Selecione...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Cargo<select value={form.roleId} onChange={e=>change('roleId',e.target.value)} disabled={!form.teamId}><option value="">Sem cargo</option>{availableRoles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label>Step inicial<select value={form.currentRoleStepId} onChange={e=>change('currentRoleStepId',e.target.value)} disabled={!selectedRole}><option value="">Sem step</option>{selectedRole?.steps.map(s=><option key={s.id} value={s.id}>{s.label} · R$ {Number(s.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}</option>)}</select></label>
        <label>Gestor<select value={form.managerId} onChange={e=>change('managerId',e.target.value)}><option value="">Não definido</option>{managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-action" disabled={saving||!form.name||!form.email||!form.password||!form.hiredAt||!form.teamId} onClick={create}>{saving?'Salvando...':'Criar colaborador'}</button></div>
    </div></div>}
  </AppLayout>
}