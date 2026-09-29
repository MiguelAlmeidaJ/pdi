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
    <main className="content">
      <AppHeader title={title} description={description} action={action} eyebrow={eyebrow}/>
      {children}
    </main>
  </div>
}
