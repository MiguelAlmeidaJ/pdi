'use client';
import { useEffect,useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionUser } from '../lib/use-session';
import { api } from '../lib/api';

const managementItems=[
  ['Visão geral','⌂','/'],
  ['Colaboradores','◎','/colaboradores'],
  ['Avaliações','✓','/avaliacoes'],
  ['Times','♙','/times'],
  ['Cargos e steps','▣','/cargos'],
  ['Qualificações','◇','/qualificacoes'],
  ['Promoções','↗','/promocoes'],
];

const userItems=[
  ['Meu desenvolvimento','◎','/meu-pdi'],
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
    <div className="brand"><div className="brand-mark">P</div><div><strong>PDI</strong><span>Desenvolvimento</span></div></div>
    <div className="sidebar-section-title">{user?.systemRole==='USER'?'MEU PDI':'WORKSPACE'}</div>
    <nav>{items.map(([label,icon,href])=>{
      const active=href==='/'?path==='/':path.startsWith(href);
      const badge=href==='/avaliacoes'&&pendingReviews>0?pendingReviews:0;
      return <a className={'nav-item '+(active?'active':'')} href={href} key={label}><i>{icon}</i><span>{label}</span>{badge>0&&<em className="nav-badge">{badge>99?'99+':badge}</em>}{active&&<b className="active-indicator"/>}</a>
    })}</nav>
    <div className="sidebar-spacer"/>
    <button className="logout-link" onClick={logout}>↪ <span>Sair</span></button>
    <div className="profile"><div className="avatar">{initials}</div><div><strong>{user?.name||'Usuário'}</strong><span>{user?.systemRole==='ADMIN'?'Admin':user?.systemRole==='MANAGER'?'Gerente':'Colaborador'}</span></div><span className="profile-chevron">⌄</span></div>
  </aside>
}