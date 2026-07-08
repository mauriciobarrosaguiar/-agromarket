'use client';

import Link from 'next/link';
import { Home, Search, PlusCircle, LayoutDashboard, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/anuncios', label: 'Buscar', icon: Search },
  { href: '/anunciar', label: 'Anunciar', icon: PlusCircle },
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
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
            <Link key={tab.href} href={tab.href} className={`mobile-tab ${active ? 'active' : ''}`}>
              <Icon size={21} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
