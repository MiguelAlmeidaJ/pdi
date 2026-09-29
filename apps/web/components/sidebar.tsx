'use client';

import { useEffect,useState } from 'react';
import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import {
  FiActivity,
  FiAward,
  FiBriefcase,
  FiCheckCircle,
  FiChevronDown,
  FiGrid,
  FiHome,
  FiLogOut,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useSessionUser } from '../lib/use-session';
import { api } from '../lib/api';

type NavItem={
  label:string;
  href:string;
  icon:IconType;
  reviewBadge?:boolean;
};

const managementItems:NavItem[]=[
  {label:'Visão geral',href:'/',icon:FiHome},
  {label:'Colaboradores',href:'/colaboradores',icon:FiUsers},
  {label:'Avaliações',href:'/avaliacoes',icon:FiCheckCircle,reviewBadge:true},
  {label:'Times',href:'/times',icon:FiGrid},
  {label:'Cargos e steps',href:'/cargos',icon:FiBriefcase},
  {label:'Qualificações',href:'/qualificacoes',icon:FiAward},
  {label:'Promoções',href:'/promocoes',icon:FiTrendingUp},
];

const userItems:NavItem[]=[
  {label:'Meu desenvolvimento',href:'/meu-pdi',icon:FiActivity},
];

export function Sidebar(){
  const path=usePathname();
  const router=useRouter();
  const user=useSessionUser();
  const items=user?.systemRole==='USER'?userItems:managementItems;
  const initials=(user?.name||'Usuário').split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const [pendingReviews,setPendingReviews]=useState(0);

  useEffect(()=>{
    if(!user||user.systemRole==='USER')return;
    api<{count:number}>('/users/reviews/pending/count')
      .then(result=>setPendingReviews(result.count))
      .catch(()=>setPendingReviews(0));
  },[user,path]);

  function logout(){
    localStorage.removeItem('pdi_token');
    localStorage.removeItem('pdi_user');
    router.push('/login');
  }

  return <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">P</div>
      <div><strong>PDI</strong><span>People Development</span></div>
    </div>

    <div className="sidebar-section-title">{user?.systemRole==='USER'?'DESENVOLVIMENTO':'GESTÃO'}</div>

    <nav className="sidebar-nav">
      {items.map(item=>{
        const active=item.href==='/'?path==='/':path.startsWith(item.href);
        const Icon=item.icon;
        const badge=item.reviewBadge&&pendingReviews>0?pendingReviews:0;
        return <Link className={'nav-item '+(active?'active':'')} href={item.href} key={item.href}>
          <span className="nav-icon"><Icon/></span>
          <span className="nav-text">{item.label}</span>
          {badge>0&&<em className="nav-badge">{badge>99?'99+':badge}</em>}
        </Link>
      })}
    </nav>

    <div className="sidebar-spacer"/>

    <div className="sidebar-bottom">
      <button className="logout-link" onClick={logout}><FiLogOut/><span>Sair</span></button>

      <div className="profile">
        <div className="avatar">{initials||<FiUser/>}</div>
        <div className="profile-copy">
          <strong>{user?.name||'Usuário'}</strong>
          <span>{user?.systemRole==='ADMIN'?'Administrador':user?.systemRole==='MANAGER'?'Gerente':'Colaborador'}</span>
        </div>
        <FiChevronDown className="profile-chevron"/>
      </div>
    </div>
  </aside>
}