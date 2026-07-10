'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Início', emoji: '🏠' },
  { href: '/anuncios', label: 'Buscar', emoji: '🔍' },
  { href: '/anunciar', label: 'Anunciar', emoji: '+', destaque: true },
  { href: '/vitrines', label: 'Lojinhas', emoji: '🏪' },
  { href: '/painel/perfil', label: 'Perfil', emoji: '👤' }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom" aria-label="Navegação mobile">
      <div className="mobile-bottom-inner">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href} className={`mobile-tab ${active ? 'active' : ''} ${tab.destaque ? 'mobile-tab-center' : ''}`}>
              <span className="mobile-tab-icon">{tab.emoji}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
