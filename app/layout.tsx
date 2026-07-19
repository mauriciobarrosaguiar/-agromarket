import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import './lovable-layout.css';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import AdminAlertWatcher from '@/components/AdminAlertWatcher';
import DocumentoStatusTextFixer from '@/components/DocumentoStatusTextFixer';
import LocationAutoUpdater from '@/components/LocationAutoUpdater';
import VitrineCupomRedeemer from '@/components/VitrineCupomRedeemer';
import OwnerEditActions from '@/components/OwnerEditActions';
import SupportButton from '@/components/SupportButton';

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
  themeColor: '#0b3d25',
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
          <div className="container footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo footer-logo" aria-label="AgroMarket">
                <span className="logo-mark">Ag</span>
                <span>AgroMarket</span>
              </Link>
              <p>O marketplace do agro perto de você. Negocie direto pelo WhatsApp.</p>
              <SupportButton />
            </div>

            <div className="footer-col">
              <strong>Explorar</strong>
              <Link href="/">Início</Link>
              <Link href="/anuncios">Buscar anúncios</Link>
              <Link href="/vitrines">Lojinhas</Link>
              <Link href="/patrocinados">Patrocinados</Link>
            </div>

            <div className="footer-col">
              <strong>Vender</strong>
              <Link href="/anunciar">Anunciar grátis</Link>
              <Link href="/painel/vitrine">Criar lojinha</Link>
              <Link href="/planos">Planos</Link>
              <Link href="/regras">Regras</Link>
            </div>

            <div className="footer-col">
              <strong>Suporte</strong>
              <Link href="/seguranca">Segurança</Link>
              <Link href="/contato">Contato</Link>
              <Link href="/termos">Termos</Link>
              <Link href="/privacidade">Privacidade</Link>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© 2026 AgroMarket. Feito no cerrado.</span>
            <span>Feito pela MBA Labs • <a href="https://www.mbalabs.com.br" target="_blank" rel="noreferrer">www.mbalabs.com.br</a></span>
          </div>
        </footer>
        <MobileBottomNav />
        <AdminAlertWatcher />
        <LocationAutoUpdater />
        <VitrineCupomRedeemer />
        <OwnerEditActions />
        <DocumentoStatusTextFixer />
      </body>
    </html>
  );
}
