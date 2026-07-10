'use client';

import Link from 'next/link';
import { Home, Search, PlusCircle, Store, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/anuncios', label: 'Buscar', icon: Search },
  { href: '/anunciar', label: 'Anunciar', icon: PlusCircle, destaque: true },
  { href: '/vitrines', label: 'Lojinhas', icon: Store },
  { href: '/painel/perfil', label: 'Perfil', icon: UserRound }
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom" aria-label="Navegação mobile">
      <div className="mobile-bottom-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href} className={`mobile-tab ${active ? 'active' : ''} ${tab.destaque ? 'mobile-tab-center' : ''}`}>
              <span className="mobile-tab-icon"><Icon size={tab.destaque ? 24 : 21} /></span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
