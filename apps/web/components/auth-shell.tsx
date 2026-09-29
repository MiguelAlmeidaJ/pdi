'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const userAllowedPaths=['/meu-pdi','/notificacoes','/perfil'];

export function AuthShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    if(pathname==='/login'){setReady(true);return}

    const token=localStorage.getItem('pdi_token');
    const rawUser=localStorage.getItem('pdi_user');
    if(!token){router.replace('/login');return}

    if(rawUser){
      try{
        const user=JSON.parse(rawUser);
        if(user.systemRole==='USER'&&!userAllowedPaths.some(path=>pathname.startsWith(path))){
          router.replace('/meu-pdi');
          return;
        }
      }catch{}
    }

    setReady(true);
  },[pathname,router]);

  if(!ready)return <div className="app-loading"><div className="brand-mark">P</div><span>Carregando PDI...</span></div>;
  return <>{children}</>;
}
