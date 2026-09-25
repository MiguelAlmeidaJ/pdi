'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(); const router=useRouter(); const [ready,setReady]=useState(false);
  useEffect(()=>{if(pathname==='/login'){setReady(true);return} const token=localStorage.getItem('pdi_token'); if(!token){router.replace('/login');return} setReady(true)},[pathname,router]);
  if(!ready)return <div className="app-loading"><div className="brand-mark">P</div><span>Carregando PDI...</span></div>;
  return <>{children}</>;
}
