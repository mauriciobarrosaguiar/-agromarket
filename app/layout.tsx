import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import InstallAppButton from '@/components/InstallAppButton';
import AdminAlertWatcher from '@/components/AdminAlertWatcher';

export const metadata: Metadata = {
  title: 'AgroMarket - Produtos, serviços e empregos no Agro',
  description: 'Marketplace para divulgar produtos agro, animais, serviços rurais, máquinas e oportunidades.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png'
  }
};

export const viewport: Viewport = {
  themeColor: '#166534',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        {children}
        <footer className="footer">
          <div className="container">
            <strong>AgroMarket</strong>
            <p>Divulgação de produtos agro, animais, serviços rurais, máquinas e empregos.</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontWeight: 800 }}>
              <Link href="/termos">Termos de uso</Link>
              <Link href="/regras">Regras</Link>
              <Link href="/seguranca">Segurança</Link>
              <Link href="/planos">Planos</Link>
              <Link href="/anuncios">Anúncios</Link>
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', fontWeight: 800 }}>
              Feito pela MBA Labs • <a href="https://www.mbalabs.com.br" target="_blank" rel="noreferrer">www.mbalabs.com.br</a>
            </div>
          </div>
        </footer>
        <InstallAppButton />
        <MobileBottomNav />
        <AdminAlertWatcher />
      </body>
    </html>
  );
}
