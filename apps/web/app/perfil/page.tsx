'use client';

import { useEffect,useState } from 'react';
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiKey,
  FiLayers,
  FiMail,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Profile={
  id:string;
  name:string;
  email:string;
  systemRole:string;
  active:boolean;
  hiredAt:string;
  team?:{id:string;name:string}|null;
  role?:{id:string;name:string}|null;
  currentRoleStep?:{id:string;label:string}|null;
  manager?:{id:string;name:string;email:string}|null;
};

export default function Perfil(){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [error,setError]=useState('');
  const [passwordOpen,setPasswordOpen]=useState(false);
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [saving,setSaving]=useState(false);
  const [success,setSuccess]=useState('');

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get('security')==='1')setPasswordOpen(true);
  },[]);

  useEffect(()=>{
    api<Profile>('/users/me')
      .then(data=>{setProfile(data);setError('')})
      .catch(e=>setError(e instanceof Error?e.message:'Erro ao carregar perfil'));
  },[]);

  async function changePassword(){
    if(newPassword!==confirmPassword){
      setError('A confirmação da nova senha não confere');
      return;
    }
    setSaving(true);setError('');setSuccess('');
    try{
      await api('/users/me/password',{
        method:'PUT',
        body:JSON.stringify({currentPassword,newPassword})
      });
      setPasswordOpen(false);
      setCurrentPassword('');setNewPassword('');setConfirmPassword('');
      setSuccess('Senha alterada com sucesso.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao alterar senha')}
    finally{setSaving(false)}
  }

  if(!profile)return <AppLayout title="Meu perfil" description="Gerencie suas informações de acesso.">{error&&<div className="form-error">{error}</div>}<div className="skeleton-card"/></AppLayout>;

  const initials=profile.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const roleLabel=profile.systemRole==='ADMIN'?'Administrador':profile.systemRole==='MANAGER'?'Gerente':'Colaborador';

  return <AppLayout title="Meu perfil" description="Informações da conta, posição atual e segurança de acesso.">
    {error&&<div className="form-error">{error}</div>}
    {success&&<div className="profile-success">{success}</div>}

    <section className="profile-hero">
      <div className="profile-hero-accent"/>
      <div className="profile-hero-content">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar-large">{initials}</div>
          <span className={profile.active?'profile-presence active':'profile-presence'}/>
        </div>

        <div className="profile-hero-copy">
          <div className="profile-hero-title">
            <div>
              <p className="eyebrow">MINHA CONTA</p>
              <h2>{profile.name}</h2>
            </div>
            <span className="profile-role-badge"><FiShield/>{roleLabel}</span>
          </div>
          <p>{profile.email}</p>
          <div className="profile-hero-meta">
            <span><FiUsers/>{profile.team?.name||'Time não definido'}</span>
            <span><FiBriefcase/>{profile.role?.name||'Cargo não definido'}</span>
            <span><FiLayers/>{profile.currentRoleStep?.label||'Step não definido'}</span>
          </div>
        </div>
      </div>
    </section>

    <section className="profile-overview-grid">
      <article className="panel profile-details-card">
        <div className="panel-head">
          <div><p className="eyebrow">INFORMAÇÕES</p><h2>Dados profissionais</h2><p className="panel-description">Informações vinculadas à sua posição atual no PDI.</p></div>
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiMail/></span>
            <div><small>E-mail</small><strong>{profile.email}</strong></div>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiUsers/></span>
            <div><small>Time</small><strong>{profile.team?.name||'Não definido'}</strong></div>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiBriefcase/></span>
            <div><small>Cargo</small><strong>{profile.role?.name||'Não definido'}</strong></div>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiLayers/></span>
            <div><small>Step atual</small><strong>{profile.currentRoleStep?.label||'Não definido'}</strong></div>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiUserCheck/></span>
            <div><small>Gestor</small><strong>{profile.manager?.name||'Não definido'}</strong></div>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-icon"><FiCalendar/></span>
            <div><small>Admissão</small><strong>{new Date(profile.hiredAt).toLocaleDateString('pt-BR')}</strong></div>
          </div>
        </div>
      </article>

      <aside className="profile-side-column">
        <article className="panel profile-security-card premium">
          <div className="profile-security-top">
            <div className="profile-security-icon"><FiKey/></div>
            <span className="profile-security-status"><FiCheckCircle/> Protegida</span>
          </div>
          <p className="eyebrow">SEGURANÇA</p>
          <h2>Senha de acesso</h2>
          <p>Atualize sua senha quando necessário para manter o acesso à conta protegido.</p>
          <button className="primary-action action-with-icon" onClick={()=>setPasswordOpen(true)}><FiKey/> Alterar senha</button>
        </article>

        <article className="panel profile-account-card">
          <p className="eyebrow">ACESSO</p>
          <h2>Perfil no sistema</h2>
          <div className="profile-account-row"><span>Status</span><strong className={profile.active?'account-status active':'account-status'}>{profile.active?'Ativo':'Inativo'}</strong></div>
          <div className="profile-account-row"><span>Nível de acesso</span><strong>{roleLabel}</strong></div>
          <div className="profile-account-row"><span>ID da conta</span><strong className="mono">{profile.id.slice(0,10)}…</strong></div>
        </article>
      </aside>
    </section>

    {passwordOpen&&<div className="modal-backdrop"><div className="modal">
      <div className="modal-head">
        <div><p className="eyebrow">SEGURANÇA</p><h2>Alterar senha</h2><p>Confirme sua senha atual antes de definir a nova.</p></div>
        <button className="modal-close" onClick={()=>setPasswordOpen(false)} aria-label="Fechar"><FiX/></button>
      </div>

      <div className="form-grid">
        <label>Senha atual<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></label>
        <label>Nova senha<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/><small className="field-help">Use pelo menos 8 caracteres.</small></label>
        <label>Confirmar nova senha<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password"/></label>
      </div>

      <div className="modal-actions">
        <button className="secondary-button" onClick={()=>setPasswordOpen(false)}>Cancelar</button>
        <button className="primary-action" disabled={saving||!currentPassword||newPassword.length<8||newPassword!==confirmPassword} onClick={changePassword}>{saving?'Salvando...':'Alterar senha'}</button>
      </div>
    </div></div>}
  </AppLayout>
}
