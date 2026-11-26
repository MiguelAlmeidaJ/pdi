'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiEdit3, FiPlus, FiSearch, FiTrendingUp, FiUserX, FiX } from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';
import { useSessionUser } from '../../lib/use-session';

type Team = { id: string; name: string };
type Role = {
  id: string;
  name: string;
  team: Team;
  steps: { id: string; code: string; label: string; salary: string; order: number }[];
};
type User = {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  active: boolean;
  hiredAt?: string | null;
  professionalSince?: string | null;
  currentRoleStepStartedAt?: string | null;
  team?: Team | null;
  role?: { id: string; name: string } | null;
  currentRoleStep?: { id: string; code: string; label: string; salary: string; order: number } | null;
  manager?: { id: string; name: string } | null;
};
type SelfProfile = { id: string; name: string; systemRole: string; team?: Team | null };
type UserForm = {
  name: string;
  email: string;
  password: string;
  systemRole: string;
  hiredAt: string;
  professionalSince: string;
  teamId: string;
  roleId: string;
  currentRoleStepId: string;
  currentRoleStepStartedAt: string;
  managerId: string;
};

const emptyForm: UserForm = {
  name: '', email: '', password: '', systemRole: 'USER', hiredAt: '', professionalSince: '',
  teamId: '', roleId: '', currentRoleStepId: '', currentRoleStepStartedAt: '', managerId: '',
};

export default function Colaboradores() {
  const sessionUser = useSessionUser();
  const [data, setData] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [self, setSelf] = useState<SelfProfile | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [promoting, setPromoting] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [promotionReason, setPromotionReason] = useState('');
  const [promotionDate, setPromotionDate] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  async function load() {
    try {
      const [users, teamList, roleList, myProfile] = await Promise.all([
        api<User[]>('/users'), api<Team[]>('/teams'), api<Role[]>('/roles'), api<SelfProfile>('/users/me'),
      ]);
      setData(users);
      setTeams(teamList);
      setRoles(roleList);
      setSelf(myProfile);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao carregar dados');
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => data.filter((user) =>
    [user.name, user.email, user.team?.name, user.role?.name]
      .some((value) => value?.toLowerCase().includes(query.toLowerCase())),
  ), [data, query]);
  const availableRoles = roles.filter((role) => !form.teamId || role.team.id === form.teamId);
  const selectedRole = roles.find((role) => role.id === form.roleId);
  const managers = data.filter((user) => user.active && (user.systemRole === 'MANAGER' || user.systemRole === 'ADMIN'));
  const isManagerProfile = form.systemRole === 'MANAGER';
  const hasCareerProgression = form.systemRole === 'USER';

  function change(name: keyof UserForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'teamId' ? { roleId: '', currentRoleStepId: '' } : {}),
      ...(name === 'roleId' ? { currentRoleStepId: '' } : {}),
      ...(name === 'systemRole' && value !== 'USER'
        ? { roleId: '', currentRoleStepId: '', currentRoleStepStartedAt: '', managerId: '' }
        : {}),
    }));
  }

  function openCreate() {
    const managerTeamId = sessionUser?.systemRole === 'MANAGER' ? self?.team?.id || '' : '';
    setForm({
      ...emptyForm,
      teamId: managerTeamId,
      managerId: sessionUser?.systemRole === 'MANAGER' ? sessionUser.id || '' : '',
    });
    setEditing(null);
    setOpen(true);
  }

  function dateInput(value?: string | null) {
    return value ? value.slice(0, 10) : '';
  }

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      systemRole: user.systemRole,
      hiredAt: dateInput(user.hiredAt),
      professionalSince: dateInput(user.professionalSince),
      teamId: user.team?.id || '',
      roleId: user.role?.id || '',
      currentRoleStepId: user.currentRoleStep?.id || '',
      currentRoleStepStartedAt: dateInput(user.currentRoleStepStartedAt),
      managerId: user.manager?.id || '',
    });
    setOpen(true);
  }

  async function saveUser() {
    setSaving(true);
    setError('');
    try {
      await api(editing ? `/users/${editing.id}` : '/users', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: editing ? undefined : form.password,
          systemRole: editing ? undefined : form.systemRole,
          hiredAt: form.hiredAt || undefined,
          professionalSince: form.professionalSince || (editing ? null : undefined),
          teamId: form.teamId,
          roleId: hasCareerProgression ? form.roleId || (editing ? null : undefined) : undefined,
          currentRoleStepId: hasCareerProgression ? form.currentRoleStepId || (editing ? null : undefined) : undefined,
          currentRoleStepStartedAt: hasCareerProgression ? form.currentRoleStepStartedAt || undefined : undefined,
          managerId: hasCareerProgression ? form.managerId || (editing ? null : undefined) : undefined,
        }),
      });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : editing ? 'Erro ao editar colaborador' : 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(
    form.name && form.email && (editing || form.password.length >= 8) && form.teamId && (!hasCareerProgression || form.hiredAt),
  );

  function nextStep(user: User) {
    if (user.systemRole !== 'USER' || !user.role || !user.currentRoleStep) return null;
    return roles.find((role) => role.id === user.role?.id)?.steps
      .filter((step) => step.order > user.currentRoleStep!.order)
      .sort((a, b) => a.order - b.order)[0] || null;
  }

  function openPromotion(user: User) {
    setPromoting(user);
    setPromotionReason('Promoção para o próximo step da carreira');
    const now = new Date();
    setPromotionDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  }

  async function promote() {
    if (!promoting) return;
    const target = nextStep(promoting);
    if (!target) return;
    setActionSaving(true); setError('');
    try {
      await api(`/users/${promoting.id}/career-step`, {
        method: 'PUT',
        body: JSON.stringify({ targetRoleStepId: target.id, reason: promotionReason, effectiveAt: promotionDate }),
      });
      setPromoting(null); await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao promover colaborador');
    } finally { setActionSaving(false); }
  }

  async function deactivate() {
    if (!deactivating) return;
    setActionSaving(true); setError('');
    try {
      await api(`/users/${deactivating.id}/deactivate`, { method: 'PUT' });
      setDeactivating(null); await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erro ao desativar colaborador');
    } finally { setActionSaving(false); }
  }

  return <AppLayout
    title="Colaboradores"
    description="Acompanhe posição atual, carreira e desenvolvimento individual."
    action={sessionUser && (sessionUser.systemRole === 'ADMIN' || sessionUser.systemRole === 'MANAGER')
      ? <button className="primary-action action-with-icon" onClick={openCreate}><FiPlus /> {sessionUser.systemRole === 'ADMIN' ? 'Novo usuário' : 'Novo colaborador'}</button>
      : undefined}
  >
    {error && <div className="form-error">{error}</div>}
    {sessionUser?.systemRole === 'MANAGER' && <div className="scope-banner"><strong>Visão do gerente</strong><span>Você está vendo somente os colaboradores do seu time.</span></div>}
    <section className="people-toolbar"><div><strong>{data.length}</strong><span> usuários cadastrados</span></div><label className="search-field"><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, cargo ou time..." /></label></section>
    <section className="people-list-panel">
      <div className="people-list-head"><span>Colaborador</span><span>Time</span><span>Cargo</span><span>Step atual</span><span>Status</span><span>Ações</span></div>
      <div className="people-list-body">
        {filtered.map((user) => {
          const initials = user.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
          const isManager = user.systemRole === 'MANAGER';
          const targetStep = nextStep(user);
          const canModify = user.active && Boolean(sessionUser?.id) && user.id !== sessionUser?.id && (sessionUser?.systemRole === 'ADMIN' || (sessionUser?.systemRole === 'MANAGER' && user.systemRole === 'USER' && Boolean(self?.team?.id) && user.team?.id === self?.team?.id));
          const promotionTitle = !canModify ? 'Ação indisponível' : !targetStep ? 'Sem próximo step disponível' : `Promover para ${targetStep.label}`;
          return <div className="people-list-row" key={user.id}>
            <Link href={`/colaboradores/${user.id}`} className="people-list-person"><div className="avatar list-avatar">{initials}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></Link>
            <div className="people-list-cell"><strong>{user.team?.name || 'Sem time'}</strong><span>Equipe</span></div>
            <div className="people-list-cell"><strong>{isManager ? 'Gerente' : user.role?.name || 'Sem cargo'}</strong><span>{isManager ? 'Perfil de gestão' : 'Posição'}</span></div>
            <div className="people-list-step"><strong>{isManager ? 'Sem evolução' : user.currentRoleStep?.label || 'Não definido'}</strong><span>{isManager ? 'Fora da trilha de carreira' : user.currentRoleStep ? `R$ ${Number(user.currentRoleStep.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem salário definido'}</span></div>
            <div><span className={user.active ? 'status-dot active' : 'status-dot'}>{user.active ? 'Ativo' : 'Inativo'}</span></div>
            <div className="people-list-actions">
              <button className="people-icon-action promote" disabled={!canModify || !targetStep} onClick={() => openPromotion(user)} title={promotionTitle} aria-label={promotionTitle}><FiTrendingUp /></button>
              <button className="people-icon-action edit" disabled={!canModify} onClick={() => openEdit(user)} title="Editar colaborador" aria-label={`Editar ${user.name}`}><FiEdit3 /></button>
              <button className="people-icon-action deactivate" disabled={!canModify} onClick={() => setDeactivating(user)} title="Desativar colaborador" aria-label={`Desativar ${user.name}`}><FiUserX /></button>
            </div>
          </div>;
        })}
      </div>
    </section>
    {!filtered.length && !error && <div className="empty-state"><b>Nenhum usuário encontrado</b><span>Ajuste a busca ou faça um novo cadastro.</span></div>}

    {open && <div className="modal-backdrop"><div className="modal modal-lg">
      <div className="modal-head"><div><p className="eyebrow">{editing ? 'EDIÇÃO' : 'CADASTRO'}</p><h2>{editing ? `Editar ${editing.name}` : isManagerProfile ? 'Novo gerente' : 'Novo colaborador'}</h2><p>{editing ? 'Atualize os dados cadastrais e a posição do usuário.' : isManagerProfile ? 'Crie o acesso de gestão e vincule-o a um time.' : 'Defina acesso, time e posição inicial no PDI.'}</p></div><button className="modal-close" onClick={() => { setOpen(false); setEditing(null); }} aria-label="Fechar"><FiX /></button></div>
      <div className="form-grid two">
        <label>Nome<input value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Nome completo" /></label>
        <label>E-mail<input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} placeholder="nome@empresa.com" /></label>
        {!editing && <label>Senha inicial<input type="password" value={form.password} onChange={(event) => change('password', event.target.value)} placeholder="Mínimo 8 caracteres" /></label>}
        <label>Perfil<select value={form.systemRole} onChange={(event) => change('systemRole', event.target.value)} disabled={!!editing || sessionUser?.systemRole === 'MANAGER'}><option value="USER">Colaborador</option>{sessionUser?.systemRole === 'ADMIN' && <><option value="MANAGER">Gerente</option><option value="ADMIN">Administrador</option></>}</select>{editing && <small className="field-help">O perfil de acesso não é alterado por esta edição.</small>}{!editing && sessionUser?.systemRole === 'MANAGER' && <small className="field-help">Gerentes podem cadastrar apenas colaboradores.</small>}</label>
        <label>Data de admissão {!hasCareerProgression && <small className="optional-label">(opcional)</small>}<input type="date" value={form.hiredAt} onChange={(event) => change('hiredAt', event.target.value)} /></label>
        <label>Experiência profissional desde <small className="optional-label">(opcional)</small><input type="date" value={form.professionalSince} onChange={(event) => change('professionalSince', event.target.value)} /></label>
        <label>Time<select value={form.teamId} onChange={(event) => change('teamId', event.target.value)} disabled={sessionUser?.systemRole === 'MANAGER'}><option value="">Selecione...</option>{(sessionUser?.systemRole === 'MANAGER' ? teams.filter((team) => team.id === self?.team?.id) : teams).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>{sessionUser?.systemRole === 'MANAGER' && <small className="field-help">O colaborador será criado no seu time.</small>}</label>
        {!hasCareerProgression
          ? <div className="manager-no-career span-2"><strong>{isManagerProfile ? 'Perfil de gestão' : 'Perfil administrativo'}</strong><span>{isManagerProfile ? 'Gerentes não possuem cargo, step, salário ou evolução na trilha de carreira.' : 'Administradores não participam da trilha de evolução de carreira.'}</span></div>
          : <>
            <label>Cargo<select value={form.roleId} onChange={(event) => change('roleId', event.target.value)} disabled={!form.teamId}><option value="">Sem cargo</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label>Step atual<select value={form.currentRoleStepId} onChange={(event) => change('currentRoleStepId', event.target.value)} disabled={!selectedRole}><option value="">Sem step</option>{selectedRole?.steps.map((step) => <option key={step.id} value={step.id}>{step.label} · R$ {Number(step.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>)}</select></label>
            <label>Está neste nível desde<input type="date" value={form.currentRoleStepStartedAt} onChange={(event) => change('currentRoleStepStartedAt', event.target.value)} disabled={!form.currentRoleStepId} /><small className="field-help">Se vazio, usaremos a admissão.</small></label>
            <label>Gestor<select value={form.managerId} onChange={(event) => change('managerId', event.target.value)}><option value="">Não definido</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>
          </>}
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={() => { setOpen(false); setEditing(null); }}>Cancelar</button><button className="primary-action" disabled={saving || !canSave} onClick={saveUser}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : isManagerProfile ? 'Criar gerente' : 'Criar colaborador'}</button></div>
    </div></div>}

    {promoting && <div className="modal-backdrop"><div className="modal">
      <div className="modal-head"><div><p className="eyebrow">PROMOÇÃO</p><h2>Promover colaborador</h2><p>Registre a movimentação de {promoting.name} para o próximo step.</p></div><button className="modal-close" onClick={() => setPromoting(null)} aria-label="Fechar"><FiX /></button></div>
      <div className="promotion-target-card"><FiTrendingUp /><div><span>Próximo step</span><strong>{nextStep(promoting)?.label}</strong><small>R$ {Number(nextStep(promoting)?.salary || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small></div></div>
      <div className="form-grid">
        <label>Data efetiva<input type="date" value={promotionDate} onChange={(event) => setPromotionDate(event.target.value)} /></label>
        <label>Justificativa<textarea value={promotionReason} onChange={(event) => setPromotionReason(event.target.value)} placeholder="Motivo da promoção" /></label>
      </div>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setPromoting(null)}>Cancelar</button><button className="primary-action" disabled={actionSaving || promotionReason.trim().length < 5 || !promotionDate} onClick={promote}>{actionSaving ? 'Promovendo...' : 'Confirmar promoção'}</button></div>
    </div></div>}

    {deactivating && <div className="modal-backdrop"><div className="modal confirmation-modal">
      <div className="confirmation-icon danger"><FiAlertTriangle /></div>
      <h2>Desativar colaborador?</h2>
      <p>O acesso de <strong>{deactivating.name}</strong> será bloqueado. O histórico e os dados profissionais serão preservados.</p>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setDeactivating(null)}>Cancelar</button><button className="danger-button" disabled={actionSaving} onClick={deactivate}>{actionSaving ? 'Desativando...' : 'Desativar'}</button></div>
    </div></div>}
  </AppLayout>;
}
