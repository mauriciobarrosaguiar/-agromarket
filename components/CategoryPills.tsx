import Link from 'next/link';
import type { Categoria } from '@/types';
import CategoryIcon from '@/components/CategoryIcon';

export default function CategoryPills({ categorias }: { categorias: Categoria[] }) {
  return (
    <div className="category-scroll">
      {categorias.map((cat) => (
        <Link key={cat.id} href={`/categoria/${cat.slug}`} className="category-chip">
          <CategoryIcon categoria={cat} className="category-chip-icon" size={20} />
          <span>{cat.nome}</span>
        </Link>
      ))}
    </div>
  );
}
