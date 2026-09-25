'use client';
import { Sidebar } from './sidebar';
export function AppLayout({children,title,description,action}:{children:React.ReactNode;title:string;description:string;action?:React.ReactNode}){return <div className="app-shell"><Sidebar/><main className="content"><header className="topbar"><div><p className="eyebrow">GESTÃO</p><h1>{title}</h1><p>{description}</p></div>{action}</header>{children}</main></div>}
