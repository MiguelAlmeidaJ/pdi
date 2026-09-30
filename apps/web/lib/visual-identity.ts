'use client';

import { useEffect,useState } from 'react';
import { API_URL } from './api';

export type VisualIdentity={
  id:string;
  appName:string;
  tagline:string;
  logoLight?:string|null;
  logoDark?:string|null;
  iconLight?:string|null;
  iconDark?:string|null;
  updatedAt?:string;
};

const fallback:VisualIdentity={
  id:'default',
  appName:'Trilha',
  tagline:'Evolução profissional com clareza.',
};

let cached:VisualIdentity|undefined;

function applyBrowserBrand(identity:VisualIdentity){
  const favicon=identity.iconLight||identity.iconDark||null;

  if(favicon){
    const existing=[
      ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')),
      ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"]')),
    ];

    existing.forEach(link=>link.remove());

    const icon=document.createElement('link');
    icon.rel='icon';
    icon.type=favicon.startsWith('data:image/png')?'image/png':favicon.startsWith('data:image/webp')?'image/webp':'image/x-icon';
    icon.href=favicon;
    icon.setAttribute('data-dynamic-brand','true');
    document.head.appendChild(icon);

    const shortcut=document.createElement('link');
    shortcut.rel='shortcut icon';
    shortcut.href=favicon;
    shortcut.setAttribute('data-dynamic-brand','true');
    document.head.appendChild(shortcut);

    const apple=document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')||document.createElement('link');
    apple.rel='apple-touch-icon';
    apple.href=favicon;
    apple.setAttribute('data-dynamic-brand','true');
    if(!apple.parentNode)document.head.appendChild(apple);
  }

  if(identity.appName)document.title=identity.appName;
}

export function useVisualIdentity(){
  const [identity,setIdentity]=useState<VisualIdentity>(cached||fallback);

  useEffect(()=>{
    let active=true;
    fetch(API_URL+'/branding/visual-identity')
      .then(response=>response.ok?response.json():Promise.reject())
      .then((data:VisualIdentity)=>{
        cached=data;
        applyBrowserBrand(data);
        if(active)setIdentity(data);
      })
      .catch(()=>{});

    return()=>{active=false};
  },[]);

  return identity;
}

export function refreshVisualIdentity(identity:VisualIdentity){
  cached=identity;
  applyBrowserBrand(identity);
  window.dispatchEvent(new CustomEvent('trilha-visual-identity-updated',{detail:identity}));
}
