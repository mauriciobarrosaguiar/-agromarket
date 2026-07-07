import Link from 'next/link';
import type { Categoria } from '@/types';

export default function CategoryPills({ categorias }: { categorias: Categoria[] }) {
  return (
    <div className="grid grid-4">
      {categorias.map((cat) => (
        <Link key={cat.id} href={`/categoria/${cat.slug}`} className="card category-card">
          <div>
            <div className="category-icon">{cat.icone || '🌱'}</div>
          </div>
          <div style={{ flex: 1 }}>
            <strong>{cat.nome}</strong>
            <p className="muted" style={{ margin: '5px 0 0' }}>{cat.tipo}</p>
          </div>
          <span>›</span>
        </Link>
      ))}
    </div>
  );
}
