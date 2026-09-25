import { Sidebar } from '../components/sidebar';

const stats = [['Colaboradores','24','+2 este mês'],['Cargos ativos','12','4 times'],['Em desenvolvimento','18','75% do time'],['Prontos para promoção','5','Aguardando análise']];
const people = [['Ana Martins','Desenvolvedora · Step 1',80,'AM'],['Carlos Souza','Suporte TI · Base',60,'CS'],['Marina Lima','Product Designer · Step 2',100,'ML']];

export default function Home() {
  return <div className="app-shell"><Sidebar /><main className="content">
    <header className="topbar"><div><p className="eyebrow">VISÃO GERAL</p><h1>Bom dia, Administrador</h1><p>Acompanhe o desenvolvimento dos seus times.</p></div><button className="icon-button">◎</button></header>
    <section className="stats-grid">{stats.map(([label,value,note])=><article className="stat-card" key={label}><div className="stat-icon">↗</div><div><p>{label}</p><strong>{value}</strong><span>{note}</span></div></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel progress-panel"><div className="panel-head"><div><p className="eyebrow">DESENVOLVIMENTO</p><h2>Progresso dos colaboradores</h2></div><button className="text-button">Ver todos →</button></div>
        <div className="people-list">{people.map(([name,role,progress,initials])=><div className="person" key={name}><div className="avatar soft">{initials}</div><div className="person-info"><div><strong>{name}</strong><span>{role}</span></div><div className="progress-row"><div className="progress-track"><div className="progress-fill" style={{width: progress+'%'}} /></div><b>{progress}%</b></div></div><button className="round-button">›</button></div>)}</div>
      </article>
      <article className="panel career-panel"><p className="eyebrow">CARREIRA</p><h2>Próximas promoções</h2><div className="promotion-highlight"><div className="promotion-ring">5</div><div><strong>colaboradores elegíveis</strong><span>Com 100% dos requisitos concluídos</span></div></div><button className="primary-button">Revisar promoções →</button></article>
    </section>
    <section className="panel activity-panel"><div className="panel-head"><div><p className="eyebrow">ATIVIDADE RECENTE</p><h2>Últimas atualizações</h2></div></div><div className="activity"><div className="activity-icon">✓</div><div><strong>Marina Lima concluiu todos os requisitos</strong><span>Product Designer · Step 2 → Step 3</span></div><time>há 2h</time></div><div className="activity"><div className="activity-icon">★</div><div><strong>Carlos Souza concluiu uma qualificação</strong><span>Fundamentos de Redes · Suporte TI</span></div><time>ontem</time></div></section>
  </main></div>;
}
