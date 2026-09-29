'use client';

import { useEffect,useMemo,useState } from 'react';
import Link from 'next/link';
import {
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiUsers,
} from 'react-icons/fi';
import { AppLayout } from '../components/app-layout';
import { api } from '../lib/api';
import { useSessionUser } from '../lib/use-session';

type User={
  id:string;
  name:string;
  email:string;
  active:boolean;
  team?:{id:string;name:string}|null;
  role?:{id:string;name:string}|null;
  currentRoleStep?:{id:string;label:string;code:string;salary:string;order:number}|null;
};

type Team={id:string;name:string};
type Role={id:string;name:string};
type Review={id:string;userId:string;submittedAt?:string|null;user:{id:string;name:string};qualification:{id:string;name:string}};
type Notification={id:string;title:string;message:string;createdAt:string;readAt?:string|null};

export default function Home(){
  const sessionUser=useSessionUser();
  const [users,setUsers]=useState<User[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [roles,setRoles]=useState<Role[]>([]);
  const [reviews,setReviews]=useState<Review[]>([]);
  const [notifications,setNotifications]=useState<Notification[]>([]);
  const [error,setError]=useState('');

  useEffect(()=>{
    Promise.all([
      api<User[]>('/users'),
      api<Team[]>('/teams'),
      api<Role[]>('/roles'),
      api<Review[]>('/users/reviews/pending'),
      api<Notification[]>('/notifications'),
    ]).then(([userList,teamList,roleList,reviewList,notificationList])=>{
      setUsers(userList);
      setTeams(teamList);
      setRoles(roleList);
      setReviews(reviewList);
      setNotifications(notificationList);
      setError('');
    }).catch(e=>setError(e instanceof Error?e.message:'Erro ao carregar visão geral'));
  },[]);

  const recentPeople=useMemo(()=>users.slice(0,5),[users]);
  const activeUsers=users.filter(user=>user.active).length;
  const withCareer=users.filter(user=>user.role&&user.currentRoleStep).length;
  const unread=notifications.filter(item=>!item.readAt).length;

  const stats=[
    {label:'Colaboradores',value:activeUsers,note:users.length+' cadastrados',icon:FiUsers,tone:'blue'},
    {label:'Times',value:teams.length,note:'estrutura ativa',icon:FiGrid,tone:'slate'},
    {label:'Cargos',value:roles.length,note:withCareer+' pessoas posicionadas',icon:FiBriefcase,tone:'indigo'},
    {label:'Avaliações pendentes',value:reviews.length,note:reviews.length?'requerem atenção':'fila em dia',icon:FiCheckCircle,tone:reviews.length?'amber':'green'},
  ];

  return <AppLayout
    title={sessionUser?.systemRole==='MANAGER'?'Visão do seu time':'Visão geral'}
    description={sessionUser?.systemRole==='MANAGER'?'Acompanhe colaboradores, estrutura e pendências do seu time.':'Acompanhe pessoas, estrutura de carreira e pendências do PDI.'}
  >
    {error&&<div className="form-error">{error}</div>}

    <section className="dashboard-kpis">
      {stats.map(stat=>{
        const Icon=stat.icon;
        return <article className="dashboard-kpi" key={stat.label}>
          <div className={'dashboard-kpi-icon '+stat.tone}><Icon/></div>
          <div className="dashboard-kpi-copy">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.note}</small>
          </div>
        </article>
      })}
    </section>

    <section className="dashboard-main-grid">
      <article className="panel dashboard-people-panel">
        <div className="panel-head">
          <div><p className="eyebrow">PESSOAS</p><h2>Colaboradores em acompanhamento</h2><p className="panel-description">Acesso rápido à posição atual e ao PDI individual.</p></div>
          <Link className="inline-link" href="/colaboradores">Ver todos <FiArrowRight/></Link>
        </div>

        <div className="dashboard-people-list">
          {recentPeople.map(user=>{
            const initials=user.name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
            return <Link className="dashboard-person-row" href={'/colaboradores/'+user.id} key={user.id}>
              <div className="avatar soft">{initials}</div>
              <div className="dashboard-person-main">
                <strong>{user.name}</strong>
                <span>{user.role?.name||'Sem cargo'} · {user.team?.name||'Sem time'}</span>
              </div>
              <div className="dashboard-person-step">
                <small>STEP ATUAL</small>
                <strong>{user.currentRoleStep?.label||'Não definido'}</strong>
              </div>
              <FiArrowRight className="row-arrow"/>
            </Link>
          })}
          {!recentPeople.length&&!error&&<div className="empty-state compact"><b>Nenhum colaborador</b><span>Cadastre pessoas para começar a acompanhar o desenvolvimento.</span></div>}
        </div>
      </article>

      <aside className="dashboard-side-stack">
        <article className="panel dashboard-attention-card">
          <div className="attention-icon"><FiCheckCircle/></div>
          <p className="eyebrow">ATENÇÃO</p>
          <h2>{reviews.length?reviews.length+' avaliação(ões) aguardando revisão':'Avaliações em dia'}</h2>
          <p>{reviews.length?'Há evidências enviadas por colaboradores esperando decisão.':'Nenhuma evidência está aguardando revisão neste momento.'}</p>
          <Link className="primary-action dashboard-action-link" href="/avaliacoes">Abrir avaliações <FiArrowRight/></Link>
        </article>

        <article className="panel dashboard-notifications-card">
          <div className="panel-head compact">
            <div><p className="eyebrow">NOTIFICAÇÕES</p><h2>{unread} não lida(s)</h2></div>
            <FiClock/>
          </div>
          <div className="dashboard-notification-preview">
            {notifications.slice(0,3).map(item=><div className={'dashboard-notification-line '+(!item.readAt?'unread':'')} key={item.id}>
              <span/>
              <div><strong>{item.title}</strong><small>{item.message}</small></div>
            </div>)}
            {!notifications.length&&<div className="mini-empty">Nenhuma atualização recente.</div>}
          </div>
          <Link className="inline-link footer-link" href="/notificacoes">Ver central <FiArrowRight/></Link>
        </article>
      </aside>
    </section>

    <section className="dashboard-secondary-grid">
      <article className="panel">
        <div className="panel-head">
          <div><p className="eyebrow">ESTRUTURA</p><h2>Distribuição do PDI</h2><p className="panel-description">Visão rápida da base estrutural do sistema.</p></div>
        </div>
        <div className="structure-metrics">
          <div><span>Times</span><strong>{teams.length}</strong></div>
          <div><span>Cargos</span><strong>{roles.length}</strong></div>
          <div><span>Com carreira definida</span><strong>{withCareer}</strong></div>
          <div><span>Sem posição definida</span><strong>{Math.max(0,users.length-withCareer)}</strong></div>
        </div>
      </article>

      <article className="panel dashboard-quick-links">
        <div className="panel-head"><div><p className="eyebrow">ATALHOS</p><h2>Ações frequentes</h2></div></div>
        <div className="quick-link-grid">
          <Link href="/colaboradores"><FiUsers/><div><strong>Colaboradores</strong><span>Consultar PDIs e posições</span></div><FiArrowRight/></Link>
          <Link href="/cargos"><FiBriefcase/><div><strong>Cargos e steps</strong><span>Revisar trilhas de carreira</span></div><FiArrowRight/></Link>
          <Link href="/avaliacoes"><FiCheckCircle/><div><strong>Avaliações</strong><span>Tratar evidências pendentes</span></div><FiArrowRight/></Link>
          <Link href="/times"><FiGrid/><div><strong>Times</strong><span>Ver estrutura organizacional</span></div><FiArrowRight/></Link>
        </div>
      </article>
    </section>
  </AppLayout>
}
