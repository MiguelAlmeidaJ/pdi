'use client';

import { useEffect,useState } from 'react';
import { FiBriefcase,FiKey,FiMail,FiShield,FiUser,FiUsers,FiX } from 'react-icons/fi';
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

  return <AppLayout title="Meu perfil" description="Consulte suas informações e gerencie sua segurança.">
    {error&&<div className="form-error">{error}</div>}
    {success&&<div className="profile-success">{success}</div>}

    <section className="profile-settings-grid">
      <article className="panel profile-settings-card">
        <div className="profile-settings-head">
          <div className="avatar xl">{initials}</div>
          <div><p className="eyebrow">CONTA</p><h2>{profile.name}</h2><span>{roleLabel}</span></div>
        </div>

        <div className="profile-settings-list">
          <div><FiMail/><span>E-mail</span><strong>{profile.email}</strong></div>
          <div><FiUsers/><span>Time</span><strong>{profile.team?.name||'Não definido'}</strong></div>
          <div><FiBriefcase/><span>Cargo</span><strong>{profile.role?.name||'Não definido'}</strong></div>
          <div><FiShield/><span>Perfil de acesso</span><strong>{roleLabel}</strong></div>
        </div>
      </article>

      <article className="panel profile-security-card">
        <div className="profile-security-icon"><FiKey/></div>
        <p className="eyebrow">SEGURANÇA</p>
        <h2>Senha de acesso</h2>
        <p>Atualize sua senha periodicamente e evite reutilizar credenciais de outros sistemas.</p>
        <button className="primary-action action-with-icon" onClick={()=>setPasswordOpen(true)}><FiKey/> Alterar senha</button>
      </article>
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
