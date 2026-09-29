'use client';

import { NotificationCenter } from './notification-center';
import { useSessionUser } from '../lib/use-session';

export function AppHeader({
  title,
  description,
  action,
  eyebrow,
}:{
  title:string;
  description:string;
  action?:React.ReactNode;
  eyebrow?:string;
}){
  const user=useSessionUser();
  const context=eyebrow||(user?.systemRole==='USER'?'DESENVOLVIMENTO':'GESTÃO');

  return <header className="app-header">
    <div className="app-header-copy">
      <p className="eyebrow">{context}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <div className="app-header-actions">
      <NotificationCenter/>
      {action}
    </div>
  </header>
}
