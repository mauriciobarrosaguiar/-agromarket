'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio, FotoAnuncio } from '@/types';
import EmptyState from '@/components/EmptyState';

type AnuncioComFotos = Anuncio & {
  fotos_anuncios?: FotoAnuncio[];
};

function PendentesContent() {
  const [anuncios, setAnuncios] = useState<AnuncioComFotos[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('anuncios')
      .select('*, categorias(*), subcategorias(*), fotos_anuncios(*)')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    const lista = ((data || []) as AnuncioComFotos[]).map((ad) => ({
      ...ad,
      fotos_anuncios: [...(ad.fotos_anuncios || [])].sort((a, b) => a.ordem - b.ordem)
    }));

    setAnuncios(lista);
  }

  useEffect(() => { load(); }, []);

  async function decidir(id: string, status: 'aprovado' | 'recusado') {
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase
      .from('anuncios')
      .update({
        status,
        data_publicacao: status === 'aprovado' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(status === 'aprovado' ? 'Anúncio aprovado.' : 'Anúncio recusado.');
      await load();
    }

    setLoadingId(null);
  }

  function whatsappLink(ad: AnuncioComFotos) {
    const numero = ad.whatsapp.replace(/\D/g, '');
    const texto = encodeURIComponent(`Olá, vi seu anúncio no AgroMarket: ${ad.titulo}`);
    return `https://wa.me/${numero}?text=${texto}`;
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Anúncios pendentes</h1>
          <p>Confira como o anúncio vai aparecer antes de aprovar.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      {message && <div className="notice">{message}</div>}

      {!anuncios.length ? <EmptyState title="Nenhum anúncio pendente" /> : (
        <div className="grid grid-2">
          {anuncios.map((ad) => {
            const fotos = ad.fotos_anuncios || [];
            const fotoPrincipal = fotos.find((foto) => foto.principal) || fotos[0];

            return (
              <div className="card" key={ad.id} style={{ overflow: 'hidden' }}>
                <div style={{ margin: '-24px -24px 18px' }}>
                  {fotoPrincipal ? (
                    <img
                      src={fotoPrincipal.url_foto}
                      alt={ad.titulo}
                      style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', background: '#eef3ea' }}
                    />
                  ) : (
                    <div style={{ height: 180, display: 'grid', placeItems: 'center', background: '#eef3ea', color: '#66735f', fontWeight: 800 }}>
                      Sem foto
                    </div>
                  )}
                </div>

                {fotos.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
                    {fotos.map((foto) => (
                      <img
                        key={foto.id}
                        src={foto.url_foto}
                        alt="Foto do anúncio"
                        style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 14, border: '1px solid #dfe8d9', flex: '0 0 auto' }}
                      />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge">{ad.categorias?.nome || ad.tipo_anuncio}{ad.subcategorias?.nome ? ` • ${ad.subcategorias.nome}` : ''}</span>
                    <h2 style={{ margin: '10px 0 4px' }}>{ad.titulo}</h2>
                    <p className="muted">{ad.bairro ? `${ad.bairro} - ` : ''}{ad.cidade} - {ad.estado}</p>
                  </div>
                  <strong style={{ whiteSpace: 'nowrap' }}>{formatMoney(ad.preco, ad.preco_a_combinar)}</strong>
                </div>

                <div style={{ marginTop: 14, padding: 14, borderRadius: 18, background: '#f7faf4' }}>
                  <strong>Descrição do anúncio</strong>
                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{ad.descricao}</p>
                </div>

                <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                  <p className="muted" style={{ margin: 0 }}><strong>Tipo:</strong> {ad.tipo_anuncio}</p>
                  <p className="muted" style={{ margin: 0 }}><strong>Quantidade:</strong> {ad.quantidade ? `${ad.quantidade} ${ad.unidade || ''}` : 'Não informado'}</p>
                  {ad.latitude && ad.longitude && <p className="muted" style={{ margin: 0 }}><strong>Localização:</strong> capturada para proximidade.</p>}
                  <p className="muted" style={{ margin: 0 }}><strong>Contato:</strong> {ad.nome_contato}</p>
                  <p className="muted" style={{ margin: 0 }}><strong>WhatsApp:</strong> {ad.whatsapp}</p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <a className="btn btn-secondary" href={whatsappLink(ad)} target="_blank" rel="noreferrer">Testar WhatsApp</a>
                  <button className="btn btn-primary" disabled={loadingId === ad.id} onClick={() => decidir(ad.id, 'aprovado')}>
                    {loadingId === ad.id ? 'Processando...' : 'Aprovar'}
                  </button>
                  <button className="btn btn-danger" disabled={loadingId === ad.id} onClick={() => decidir(ad.id, 'recusado')}>
                    Recusar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PendentesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><PendentesContent /></div></main></AuthGuard>;
}
