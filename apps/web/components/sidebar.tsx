'use client';
import { usePathname, useRouter } from 'next/navigation';

const items=[
  ['Visão geral','⌂','/'],
  ['Colaboradores','◎','/colaboradores'],
  ['Times','♙','/times'],
  ['Cargos e steps','▣','/cargos'],
  ['Qualificações','◇','/qualificacoes'],
  ['Promoções','↗','/promocoes'],
];

export function Sidebar(){
  const path=usePathname();
  const router=useRouter();
  function logout(){localStorage.removeItem('pdi_token');localStorage.removeItem('pdi_user');router.push('/login')}
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">P</div><div><strong>PDI</strong><span>Desenvolvimento</span></div></div>
    <div className="sidebar-section-title">WORKSPACE</div>
    <nav>{items.map(([label,icon,href])=>{
      const active=href==='/'?path==='/':path.startsWith(href);
      return <a className={'nav-item '+(active?'active':'')} href={href} key={label}><i>{icon}</i><span>{label}</span>{active&&<b className="active-indicator"/>}</a>
    })}</nav>
    <div className="sidebar-spacer"/>
    <button className="logout-link" onClick={logout}>↪ <span>Sair</span></button>
    <div className="profile"><div className="avatar">AD</div><div><strong>Administrador</strong><span>Admin</span></div><span className="profile-chevron">⌄</span></div>
  </aside>
}