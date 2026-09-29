'use client';

import { useEffect,useState } from 'react';
import { usePathname,useRouter } from 'next/navigation';
import { api } from '../lib/api';

type Notification={
  id:string;
  type:string;
  title:string;
  message:string;
  href?:string|null;
  readAt?:string|null;
  createdAt:string;
};

export function NotificationCenter(){
  const router=useRouter();
  const path=usePathname();
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<Notification[]>([]);
  const [count,setCount]=useState(0);

  async function load(){
    try{
      const [notifications,unread]=await Promise.all([
        api<Notification[]>('/notifications'),
        api<{count:number}>('/notifications/unread-count')
      ]);
      setItems(notifications.slice(0,6));
      setCount(unread.count);
    }catch{}
  }

  useEffect(()=>{load()},[path]);

  async function openNotification(item:Notification){
    if(!item.readAt){
      await api('/notifications/'+item.id+'/read',{method:'PUT'}).catch(()=>null);
    }
    setOpen(false);
    if(item.href)router.push(item.href);
    else router.push('/notificacoes');
  }

  async function markAll(){
    await api('/notifications/read-all',{method:'PUT'}).catch(()=>null);
    await load();
  }

  return <div className="notification-center">
    <button className="notification-trigger" onClick={()=>{setOpen(!open);if(!open)load()}} aria-label="Notificações">
      ♢
      {count>0&&<span>{count>99?'99+':count}</span>}
    </button>
    {open&&<div className="notification-popover">
      <div className="notification-popover-head">
        <div><strong>Notificações</strong><span>{count} não lida(s)</span></div>
        {count>0&&<button onClick={markAll}>Marcar todas como lidas</button>}
      </div>
      <div className="notification-popover-list">
        {items.map(item=><button key={item.id} className={'notification-mini '+(!item.readAt?'unread':'')} onClick={()=>openNotification(item)}>
          <span className="notification-mini-dot"/>
          <div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small></div>
        </button>)}
        {!items.length&&<div className="notification-empty">Nenhuma notificação por enquanto.</div>}
      </div>
      <button className="notification-view-all" onClick={()=>{setOpen(false);router.push('/notificacoes')}}>Ver todas as notificações →</button>
    </div>}
  </div>
}
