'use client';

import { useEffect,useState } from 'react';
import { useVisualIdentity, type VisualIdentity } from '../lib/visual-identity';

export function TrilhaBrand({
  compact=false,
  theme='light',
  className='',
}:{
  compact?:boolean;
  theme?:'light'|'dark';
  className?:string;
}){
  const identity=useVisualIdentity();
  const [current,setCurrent]=useState<VisualIdentity>(identity);

  useEffect(()=>setCurrent(identity),[identity]);
  useEffect(()=>{
    const listener=(event:Event)=>setCurrent((event as CustomEvent<VisualIdentity>).detail);
    window.addEventListener('trilha-visual-identity-updated',listener);
    return()=>window.removeEventListener('trilha-visual-identity-updated',listener);
  },[]);

  const src=compact
    ? (theme==='dark'?current.iconDark:current.iconLight)
    : (theme==='dark'?current.logoDark:current.logoLight);

  return <div className={'trilha-brand '+(compact?'compact ':'')+(theme==='dark'?'dark ':'')+className}>
    {src
      ? <img className={compact?'trilha-brand-image compact':'trilha-brand-image'} src={src} alt={current.appName||'Trilha'}/>
      : <>
          <div className="trilha-brand-fallback-mark">T</div>
          {!compact&&<div className="trilha-brand-copy"><strong>{current.appName||'Trilha'}</strong><span>{current.tagline||'Evolução profissional com clareza.'}</span></div>}
        </>
    }
  </div>
}
