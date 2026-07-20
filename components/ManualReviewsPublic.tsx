'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AvaliacaoManual = {
  id: string;
  nome_avaliador: string;
  nota: number;
  comentario: string;
  origem?: string | null;
  data_avaliacao?: string | null;
};

function estrelas(nota: number) {
  return Array.from({ length: 5 }).map((_, index) => (
    <Star key={index} size={17} fill={index < nota ? 'currentColor' : 'none'} />
  ));
}

function dataBR(value?: string | null) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function ManualReviewsPublic() {
  const pathname = usePathname();
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoManual[]>([]);
  const [nomeVitrine, setNomeVitrine] = useState('');

  useEffect(() => {
    async function load() {
      setAvaliacoes([]);
      setNomeVitrine('');

      if (!pathname.startsWith('/vendedor/')) return;
      const slug = decodeURIComponent(pathname.split('/').filter(Boolean)[1] || '');
      if (!slug) return;

      const { data: vitrine } = await supabase
        .from('vitrines')
        .select('id,nome_vitrine')
        .eq('slug', slug)
        .maybeSingle();

      if (!vitrine?.id) return;
      setNomeVitrine(vitrine.nome_vitrine || 'lojinha');

      const { data } = await supabase
        .from('vitrine_avaliacoes_manuais')
        .select('id,nome_avaliador,nota,comentario,origem,data_avaliacao')
        .eq('vitrine_id', vitrine.id)
        .eq('status', 'aprovada')
        .order('data_avaliacao', { ascending: false })
        .order('created_at', { ascending: false });

      setAvaliacoes((data || []) as AvaliacaoManual[]);
    }

    load();
  }, [pathname]);

  if (!pathname.startsWith('/vendedor/') || !avaliacoes.length) return null;

  return (
    <section className="section">
      <div className="container">
        <div className="card">
          <div className="section-head section-head-compact">
            <div>
              <h2>Avaliações de clientes</h2>
              <p>Depoimentos recebidos e registrados pelo AgroMarket para {nomeVitrine}.</p>
            </div>
          </div>

          <div className="grid grid-2">
            {avaliacoes.map((avaliacao) => (
              <article className="card" style={{ background: '#f8faf4' }} key={avaliacao.id}>
                <div style={{ color: '#166534', display: 'flex', gap: 3, marginBottom: 8 }}>
                  {estrelas(Number(avaliacao.nota || 5))}
                </div>
                <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{avaliacao.comentario}</p>
                <p className="muted" style={{ marginBottom: 0 }}>
                  — {avaliacao.nome_avaliador}
                  {avaliacao.data_avaliacao ? ` • ${dataBR(avaliacao.data_avaliacao)}` : ''}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
