import { FiArrowRight,FiCheckCircle,FiFileText,FiGitMerge,FiTrendingUp } from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';

const steps=[
  {label:'Elegibilidade',description:'Requisitos e tempo validados',icon:FiCheckCircle},
  {label:'Solicitação',description:'Pedido formal de progressão',icon:FiFileText},
  {label:'Aprovação',description:'Decisão e justificativa do gestor',icon:FiGitMerge},
  {label:'Novo step',description:'Movimentação e histórico',icon:FiTrendingUp},
];

export default function Promocoes(){
  return <AppLayout title="Promoções" description="Analise colaboradores prontos para avançar na carreira.">
    <section className="promotion-roadmap">
      <div className="promotion-roadmap-head">
        <div className="empty-icon large"><FiTrendingUp/></div>
        <div><p className="eyebrow">EM CONSTRUÇÃO</p><h2>Fluxo de promoções</h2><p>Esta área receberá solicitações elegíveis, análise do gestor e histórico de decisões.</p></div>
      </div>

      <div className="promotion-roadmap-grid">
        {steps.map((step,index)=>{
          const Icon=step.icon;
          return <div className="promotion-roadmap-step" key={step.label}>
            <div className="roadmap-index">{String(index+1).padStart(2,'0')}</div>
            <div className="roadmap-icon"><Icon/></div>
            <strong>{step.label}</strong>
            <span>{step.description}</span>
            {index<steps.length-1&&<FiArrowRight className="roadmap-arrow"/>}
          </div>
        })}
      </div>

      <div className="promotion-roadmap-note"><FiCheckCircle/><div><strong>Base pronta</strong><span>Elegibilidade, histórico, notificações e movimentação de carreira já estão disponíveis para sustentar este fluxo.</span></div></div>
    </section>
  </AppLayout>
}
