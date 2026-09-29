'use client';

import { Sidebar } from './sidebar';
import { AppHeader } from './app-header';

export function AppLayout({
  children,
  title,
  description,
  action,
  eyebrow,
}:{
  children:React.ReactNode;
  title:string;
  description:string;
  action?:React.ReactNode;
  eyebrow?:string;
}){
  return <div className="app-shell">
    <Sidebar/>
    <div className="app-workspace">
      <AppHeader title={title} description={description} action={action} eyebrow={eyebrow}/>
      <main className="page-content">
        {children}
      </main>
    </div>
  </div>
}
