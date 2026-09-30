import Link from 'next/link';
import { FiArrowRight,FiImage } from 'react-icons/fi';
import { AppLayout } from '../../components/app-layout';

export default function Configuracoes(){
  return <AppLayout title="Configurações" description="Gerencie preferências administrativas da Trilha.">
    <section className="settings-grid">
      <Link className="settings-card" href="/configuracoes/identidade-visual">
        <div className="settings-card-icon"><FiImage/></div>
        <div>
          <strong>Identidade visual</strong>
          <span>Nome, assinatura, logos, ícones e favicon da aplicação.</span>
        </div>
        <FiArrowRight className="settings-card-arrow"/>
      </Link>
    </section>
  </AppLayout>
}
