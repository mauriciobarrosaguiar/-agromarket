import {
  Briefcase,
  Carrot,
  Egg,
  Hammer,
  Home,
  Map,
  Package,
  PawPrint,
  Shovel,
  Sprout,
  Tractor,
  Truck,
  Wheat,
  Wrench,
  type LucideIcon
} from 'lucide-react';
import type { Categoria } from '@/types';

type CategoryIconProps = {
  categoria: Categoria;
  className?: string;
  size?: number;
};

function normalize(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isInitials(value?: string | null) {
  return /^[a-z]{1,4}$/i.test(String(value || '').trim());
}

function iconForCategory(categoria: Categoria): LucideIcon {
  const text = `${normalize(categoria.slug)} ${normalize(categoria.nome)} ${normalize(categoria.tipo)}`;

  if (text.includes('ovo') || text.includes('reproducao')) return Egg;
  if (text.includes('animal') || text.includes('gado') || text.includes('aves') || text.includes('suino')) return PawPrint;
  if (text.includes('racao') || text.includes('insumo') || text.includes('semente')) return Wheat;
  if (text.includes('maquina') || text.includes('trator')) return Tractor;
  if (text.includes('implemento')) return Shovel;
  if (text.includes('ferramenta')) return Hammer;
  if (text.includes('servico') || text.includes('mao-de-obra') || text.includes('mao de obra')) return Wrench;
  if (text.includes('emprego') || text.includes('vaga')) return Briefcase;
  if (text.includes('frete') || text.includes('transporte')) return Truck;
  if (text.includes('muda') || text.includes('planta')) return Sprout;
  if (text.includes('hortalica') || text.includes('chacara') || text.includes('produto')) return Carrot;
  if (text.includes('terra') || text.includes('propriedade') || text.includes('fazenda')) return Map;
  if (text.includes('loja') || text.includes('vitrine')) return Home;

  return Package;
}

export default function CategoryIcon({ categoria, className, size = 24 }: CategoryIconProps) {
  const customIcon = String(categoria.icone || '').trim();

  if (customIcon && !isInitials(customIcon)) {
    return (
      <span className={className} aria-hidden="true">
        {customIcon}
      </span>
    );
  }

  const Icon = iconForCategory(categoria);

  return (
    <span className={className} aria-hidden="true">
      <Icon size={size} strokeWidth={2.4} />
    </span>
  );
}
