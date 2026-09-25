import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDI',
  description: 'Plano de Desenvolvimento Individual',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
