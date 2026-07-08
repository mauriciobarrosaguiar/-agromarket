'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MapPin, MessageCircle, ShieldCheck, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Vitrine } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';
import ShareButton from '@/components/ShareButton';

export default function VendedorClient() {
  const params = useParams<{ slug: string }>();
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: vitrineData } = await supabase
        .from('vitrines')
        .select('*')
        .eq('slug', params.slug)
        .eq('vitrine_ativa', true)
        .single();

      if (vitrineData) {
        const vitrineAtual = vitrineData as Vitrine;
        setVitrine(vitrineAtual);

        const { data: ads } = await supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
          .eq('usuario_id', vitrineAtual.usuario_id)
          .eq('status', 'aprovado')
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false });

        setAnuncios((ads || []) as Anuncio[]);
      }

      setLoading(false);
    }

    load();
  }, [params.slug]);

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando vitrine...</div></div></main>;
  if (!vitrine) return <main className="page"><div className="container"><EmptyState title="Vitrine não encontrada" description="Essa vitrine pode estar desativada ou ainda não existir." /></div></main>;

  const numero = (vitrine.whatsapp || '').replace(/\D/g, '');
  const linkVitrine = `https://agromarket-two.vercel.app/vendedor/${vitrine.slug}`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Olá, vi sua vitrine no AgroMarket: ${vitrine.nome_vitrine}\n\nLink da vitrine: ${linkVitrine}`)}` : null;
  const logoFit = vitrine.logo_object_fit || 'cover';
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const localTexto = `${vitrine.cidade || 'Cidade não informada'} - ${vitrine.estado || 'UF'}`;
  const descricaoCurta = (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.').length > 150
    ? `${(vitrine.descricao || '').slice(0, 150)}...`
    : (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.');
  const mensagemVitrine = `🌱 Vitrine AgroMarket\n\n🏪 ${vitrine.nome_vitrine}\n📍 ${localTexto}\n📦 ${anuncios.length} anúncio(s) disponível(is)\n\n${descricaoCurta}\n\nVeja a vitrine:`;

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 160, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', display: 'flex', alignItems: 'end', padding: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: '#fff' }}>
              <div style={{ width: 78, height: 78, borderRadius: 24, background: '#fff', color: '#14532d', display: 'grid', placeItems: 'center', overflow: 'hidden', fontWeight: 900, fontSize: 24 }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt={vitrine.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={34} />}
              </div>
              <div>
                <h1 style={{ margin: 0, color: '#fff' }}>{vitrine.nome_vitrine}</h1>
                <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.86)', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={17} /> {localTexto}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {vitrine.verificado && <span className="badge"><ShieldCheck size={14} /> Verificado</span>}
              {vitrine.destaque && <span className="badge">Vitrine destaque</span>}
              <span className="badge">{anuncios.length} anúncio(s)</span>
              <span className="badge">{vitrine.plano === 'gratis_lancamento' ? 'Grátis no lançamento' : vitrine.plano}</span>
            </div>

            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{vitrine.descricao || 'Vendedor AgroMarket.'}</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar vendedor</a>}
              <ShareButton label="Compartilhar vitrine" title={vitrine.nome_vitrine} message={mensagemVitrine} path={`/vendedor/${vitrine.slug}`} />
              <Link className="btn btn-secondary" href="/anuncios">Ver outros anúncios</Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Produtos e serviços desta vitrine</h2>
              <p>Todos os anúncios aprovados desse vendedor.</p>
            </div>
          </div>

          {anuncios.length ? (
            <div className="grid grid-4">
              {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          ) : <EmptyState title="Nenhum anúncio aprovado nessa vitrine" />}
        </section>
      </div>
    </main>
  );
}
