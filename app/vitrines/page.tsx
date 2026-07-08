'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, ShieldCheck, ShoppingBag, Star, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AvaliacaoVendedor, Vitrine } from '@/types';
import EmptyState from '@/components/EmptyState';
import RatingStars from '@/components/RatingStars';

type Loja = Vitrine & {
  quantidade_anuncios?: number;
  media_avaliacao?: number;
  total_avaliacoes?: number;
};

type AnuncioContagem = {
  id: string;
  usuario_id: string;
};

function calcularResumo(avaliacoes: AvaliacaoVendedor[], vitrineId: string) {
  const itens = avaliacoes.filter((av) => av.vitrine_id === vitrineId && av.status === 'aprovada');
  const total = itens.length;
  const media = total ? itens.reduce((acc, av) => acc + Number(av.nota || 0), 0) / total : 0;
  return { total, media };
}

export default function VitrinesPage() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: vitrinesData } = await supabase
        .from('vitrines')
        .select('*')
        .eq('vitrine_ativa', true)
        .order('destaque', { ascending: false })
        .order('created_at', { ascending: false });

      const vitrines = (vitrinesData || []) as Vitrine[];
      const vitrineIds = vitrines.map((loja) => loja.id);
      const usuariosIds = vitrines.map((loja) => loja.usuario_id);

      const [{ data: anunciosData }, { data: avaliacoesData }] = await Promise.all([
        usuariosIds.length
          ? supabase.from('anuncios').select('id, usuario_id').eq('status', 'aprovado').in('usuario_id', usuariosIds)
          : Promise.resolve({ data: [] }),
        vitrineIds.length
          ? supabase.from('vendedor_avaliacoes').select('*').eq('status', 'aprovada').in('vitrine_id', vitrineIds)
          : Promise.resolve({ data: [] })
      ]);

      const anuncios = (anunciosData || []) as AnuncioContagem[];
      const avaliacoes = (avaliacoesData || []) as AvaliacaoVendedor[];

      const lojasComResumo = vitrines.map((loja) => {
        const resumo = calcularResumo(avaliacoes, loja.id);
        return {
          ...loja,
          quantidade_anuncios: anuncios.filter((ad) => ad.usuario_id === loja.usuario_id).length,
          media_avaliacao: resumo.media,
          total_avaliacoes: resumo.total
        };
      });

      setLojas(lojasComResumo);
      setLoading(false);
    }

    load();
  }, []);

  const lojasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lojas;

    return lojas.filter((loja) => `${loja.nome_vitrine} ${loja.descricao || ''} ${loja.cidade || ''} ${loja.estado || ''}`.toLowerCase().includes(termo));
  }, [busca, lojas]);

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ background: 'linear-gradient(135deg, #052e16, #166534)', color: '#fff', marginBottom: 18 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}><ShoppingBag size={14} /> Lojinhas AgroMarket</span>
          <h1 style={{ color: '#fff', marginBottom: 8 }}>Vitrines de vendedores</h1>
          <p style={{ color: 'rgba(255,255,255,.84)' }}>Encontre vendedores, chácaras, prestadores de serviço e lojas do agro em uma página pública.</p>

          <div style={{ position: 'relative', marginTop: 14 }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#5f6f5b' }} />
            <input
              className="input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar lojinha, cidade, produto ou vendedor..."
              style={{ paddingLeft: 48 }}
            />
          </div>
        </section>

        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="mini-card"><strong>{lojas.length}</strong><br /><span className="muted">lojinhas ativas</span></div>
          <div className="mini-card"><strong>{lojas.reduce((acc, loja) => acc + (loja.quantidade_anuncios || 0), 0)}</strong><br /><span className="muted">anúncios</span></div>
          <div className="mini-card"><strong>{lojas.filter((loja) => loja.verificado).length}</strong><br /><span className="muted">verificadas</span></div>
        </div>

        {loading ? <div className="card">Carregando lojinhas...</div> : lojasFiltradas.length ? (
          <div className="grid grid-2">
            {lojasFiltradas.map((loja) => {
              const logoFit = loja.logo_object_fit || 'cover';
              const logoPosition = loja.logo_object_position || 'center';
              const bannerPosition = loja.banner_object_position || 'center';
              return (
                <Link key={loja.id} href={`/vendedor/${loja.slug}`} className="card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none' }}>
                  <div style={{ minHeight: 150, background: loja.banner_url ? `url(${loja.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', display: 'flex', alignItems: 'end', padding: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58))' }} />
                    <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', color: '#fff' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 22, background: '#fff', color: '#14532d', display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: '0 14px 30px rgba(0,0,0,.2)' }}>
                        {loja.foto_url ? <img src={loja.foto_url} alt={loja.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={32} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', color: '#fff', fontSize: 22, lineHeight: 1.08 }}>{loja.nome_vitrine}</strong>
                        <span style={{ color: 'rgba(255,255,255,.86)', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5 }}><MapPin size={15} /> {loja.cidade || 'Cidade'} - {loja.estado || 'UF'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                      {loja.verificado && <span className="badge"><ShieldCheck size={14} /> Verificada</span>}
                      {loja.destaque && <span className="badge">Destaque</span>}
                      <span className="badge"><Store size={14} /> {loja.quantidade_anuncios || 0} anúncio(s)</span>
                      <span className="badge"><Star size={14} /> {loja.total_avaliacoes ? `${loja.media_avaliacao?.toFixed(1)} estrelas` : 'Sem avaliações'}</span>
                    </div>

                    <RatingStars nota={loja.media_avaliacao || 0} total={loja.total_avaliacoes || 0} size={16} />
                    <p className="muted" style={{ margin: '10px 0 0', lineHeight: 1.45 }}>{loja.descricao || 'Vitrine de produtos e serviços no AgroMarket.'}</p>
                    <span className="btn btn-secondary btn-full" style={{ marginTop: 12 }}>Abrir lojinha</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : <EmptyState title="Nenhuma lojinha encontrada" description="Tente buscar por outro nome, cidade ou descrição." />}
      </div>
    </main>
  );
}
