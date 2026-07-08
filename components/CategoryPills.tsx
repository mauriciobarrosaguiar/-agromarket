import Link from 'next/link';
import type { Categoria } from '@/types';

export default function CategoryPills({ categorias }: { categorias: Categoria[] }) {
  return (
    <div className="category-scroll">
      {categorias.map((cat) => (
        <Link key={cat.id} href={`/categoria/${cat.slug}`} className="category-chip">
          <span className="category-chip-icon">{cat.icone || cat.nome.slice(0, 2).toUpperCase()}</span>
          <span>{cat.nome}</span>
        </Link>
      ))}
    </div>
  );
}
