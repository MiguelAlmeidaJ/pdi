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

export function useVisualIdentity(){
  const [identity,setIdentity]=useState<VisualIdentity>(cached||fallback);

  useEffect(()=>{
    let active=true;
    fetch(API_URL+'/branding/visual-identity')
      .then(response=>response.ok?response.json():Promise.reject())
      .then((data:VisualIdentity)=>{
        cached=data;
        if(active)setIdentity(data);
        if(data.iconLight){
          let link=document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dynamic-brand]');
          if(!link){
            link=document.createElement('link');
            link.rel='icon';
            link.setAttribute('data-dynamic-brand','true');
            document.head.appendChild(link);
          }
          link.href=data.iconLight;
        }
        if(data.appName)document.title=data.appName;
      })
      .catch(()=>{});
    return()=>{active=false};
  },[]);

  return identity;
}

export function refreshVisualIdentity(identity:VisualIdentity){
  cached=identity;
  window.dispatchEvent(new CustomEvent('trilha-visual-identity-updated',{detail:identity}));
}
