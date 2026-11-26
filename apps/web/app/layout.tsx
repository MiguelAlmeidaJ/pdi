import type { Metadata } from 'next';
import './globals.css';
import { AuthShell } from '../components/auth-shell';

export const metadata: Metadata = {
  title: 'Trilha',
  description: 'Trilha — Evolução profissional com clareza.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body suppressHydrationWarning><AuthShell>{children}</AuthShell></body></html>;
}
