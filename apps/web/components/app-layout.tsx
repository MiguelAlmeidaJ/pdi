'use client';
import { Sidebar } from './sidebar';
import { NotificationCenter } from './notification-center';
import { useSessionUser } from '../lib/use-session';

export function AppLayout({children,title,description,action}:{children:React.ReactNode;title:string;description:string;action?:React.ReactNode}){
  const user=useSessionUser();
  return <div className="app-shell"><Sidebar/><main className="content"><header className="topbar"><div><p className="eyebrow">{user?.systemRole==='USER'?'DESENVOLVIMENTO':'GESTÃO'}</p><h1>{title}</h1><p>{description}</p></div><div className="topbar-actions"><NotificationCenter/>{action}</div></header>{children}</main></div>
}
