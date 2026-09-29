'use client';

import { useEffect,useMemo,useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../components/app-layout';
import { api } from '../../lib/api';

type Notification={
  id:string;
  type:string;
  title:string;
  message:string;
  href?:string|null;
  metadata?:Record<string,unknown>|null;
  readAt?:string|null;
  createdAt:string;
};

const typeLabels:Record<string,string>={
  QUALIFICATION_SUBMITTED:'Avaliação',
  QUALIFICATION_EVALUATED:'Qualificação',
  CAREER_STEP_CHANGED:'Carreira',
  PROMOTION_REQUESTED:'Promoção',
  PROMOTION_DECIDED:'Promoção',
  FEEDBACK:'Feedback'
};

export default function Notificacoes(){
  const router=useRouter();
  const [data,setData]=useState<Notification[]>([]);
  const [filter,setFilter]=useState<'ALL'|'UNREAD'>('ALL');
  const [error,setError]=useState('');

  async function load(){
    try{
      setData(await api<Notification[]>('/notifications'));
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar notificações')}
  }

  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>filter==='UNREAD'?data.filter(item=>!item.readAt):data,[data,filter]);
  const unread=data.filter(item=>!item.readAt).length;

  async function markRead(item:Notification){
    if(!item.readAt){
      await api('/notifications/'+item.id+'/read',{method:'PUT'});
      await load();
    }
    if(item.href)router.push(item.href);
  }

  async function markAll(){
    await api('/notifications/read-all',{method:'PUT'});
    await load();
  }

  return <AppLayout title="Notificações" description="Acompanhe avaliações, movimentações e eventos importantes do seu PDI.">
    {error&&<div className="form-error">{error}</div>}

    <div className="notifications-toolbar">
      <div className="notification-filters">
        <button className={filter==='ALL'?'filter-chip active':'filter-chip'} onClick={()=>setFilter('ALL')}>Todas</button>
        <button className={filter==='UNREAD'?'filter-chip active':'filter-chip'} onClick={()=>setFilter('UNREAD')}>Não lidas {unread>0&&'('+unread+')'}</button>
      </div>
      {unread>0&&<button className="secondary-button" onClick={markAll}>Marcar todas como lidas</button>}
    </div>

    <section className="notification-page-list">
      {filtered.map(item=><button key={item.id} className={'notification-page-item '+(!item.readAt?'unread':'')} onClick={()=>markRead(item)}>
        <div className="notification-page-icon">{item.type==='QUALIFICATION_EVALUATED'?'✓':item.type==='CAREER_STEP_CHANGED'?'↗':item.type==='QUALIFICATION_SUBMITTED'?'◎':'•'}</div>
        <div className="notification-page-content">
          <div><span className="notification-kind">{typeLabels[item.type]||'Atualização'}</span>{!item.readAt&&<em>NOVA</em>}</div>
          <strong>{item.title}</strong>
          <p>{item.message}</p>
          <small>{new Date(item.createdAt).toLocaleString('pt-BR')}</small>
        </div>
        <span className="notification-page-arrow">{item.href?'→':''}</span>
      </button>)}
      {!filtered.length&&!error&&<div className="empty-state"><b>Nenhuma notificação</b><span>{filter==='UNREAD'?'Você está em dia com todas as atualizações.':'Os eventos importantes do PDI aparecerão aqui.'}</span></div>}
    </section>
  </AppLayout>
}
