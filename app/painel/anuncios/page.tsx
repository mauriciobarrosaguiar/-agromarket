'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, Pause, Pencil, Play, RefreshCcw, Sparkles, Trash2 } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio, DestaqueSolicitacao, FotoAnuncio, MonetizacaoPlano, StatusAnuncio } from '@/types';
import EmptyState from '@/components/EmptyState';

type AnuncioLinha = Anuncio & {
  fotos_anuncios?: FotoAnuncio[];
};

const STATUS_LABEL: Record<StatusAnuncio, string> = {
  pendente: 'Aguardando aprovação',
  aprovado: 'Publicado',
  recusado: 'Recusado',
  pausado: 'Pausado',
  vendido: 'Vendido',
  expirado: 'Excluído',
  bloqueado: 'Bloqueado'
};

function capa(ad: AnuncioLinha) {
  const fotos = [...(ad.fotos_anuncios || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  return fotos.find((foto) => foto.principal)?.url_foto || fotos[0]?.url_foto || null;
}

function formatarData(data?: string | null) {
  if (!data) return null;
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarPrecoPlano(valor: number | string | null | undefined) {
  const numero = typeof valor === 'number' ? valor : Number(valor || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(numero) ? numero : 0);
}

function MeusAnuncios() {
  const [anuncios, setAnuncios] = useState<AnuncioLinha[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, DestaqueSolicitacao>>({});
  const [planosDestaque, setPlanosDestaque] = useState<MonetizacaoPlano[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const [{ data: ads }, { data: pedidos }, { data: planos }] = await Promise.all([
      supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('usuario_id', userData.user.id)
        .neq('status', 'expirado')
        .order('created_at', { ascending: false }),
      supabase
        .from('destaque_solicitacoes')
        .select('*')
        .eq('usuario_id', userData.user.id)
        .in('status', ['pendente', 'aprovado'])
        .order('created_at', { ascending: false }),
      supabase
        .from('monetizacao_planos')
        .select('*')
        .eq('ativo', true)
        .eq('tipo', 'destaque')
        .order('ordem')
    ]);

    const mapa: Record<string, DestaqueSolicitacao> = {};
    ((pedidos || []) as DestaqueSolicitacao[]).forEach((pedido) => {
      if (!mapa[pedido.anuncio_id]) mapa[pedido.anuncio_id] = pedido;
    });

    setSolicitacoes(mapa);
    setPlanosDestaque((planos || []) as MonetizacaoPlano[]);
    setAnuncios((ads || []) as AnuncioLinha[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function atualizarAnuncio(id: string, patch: Partial<Anuncio>, sucesso: string) {
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase
      .from('anuncios')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(sucesso);
      await load();
    }

    setLoadingId(null);
  }

  async function solicitarDestaque(ad: AnuncioLinha, plano: MonetizacaoPlano) {
    const dias = Number(plano.dias || 7);
    const ok = confirm(`Solicitar ${plano.nome} para o anúncio "${ad.titulo}"?\n\nValor: ${formatarPrecoPlano(plano.preco)}\nO admin irá analisar, confirmar pagamento e liberar.`);
    if (!ok) return;

    setLoadingId(ad.id);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('destaque_solicitacoes').insert({
      anuncio_id: ad.id,
      usuario_id: userData.user?.id,
      dias,
      status: 'pendente',
      observacao: `${plano.nome} - ${formatarPrecoPlano(plano.preco)}`
    });

    if (error) {
      setMessage(error.message.includes('duplicate') ? 'Esse anúncio já tem uma solicitação de destaque pendente.' : error.message);
    } else {
      setMessage('Solicitação de destaque enviada. Aguarde a liberação do administrador.');
      await load();
    }

    setLoadingId(null);
  }

  async function pausar(ad: AnuncioLinha) {
    await atualizarAnuncio(ad.id, { status: 'pausado' as StatusAnuncio }, 'Anúncio pausado. Ele saiu da busca pública.');
  }

  async function ativar(ad: AnuncioLinha) {
    await atualizarAnuncio(ad.id, { status: 'aprovado' as StatusAnuncio, data_publicacao: new Date().toISOString() }, 'Anúncio ativado novamente.');
  }

  async function vendido(ad: AnuncioLinha) {
    await atualizarAnuncio(ad.id, { status: 'vendido' as StatusAnuncio, destaque: false, destaque_inicio: null, destaque_fim: null }, 'Anúncio marcado como vendido.');
  }

  async function renovar(ad: AnuncioLinha) {
    await atualizarAnuncio(
      ad.id,
      {
        status: 'aprovado' as StatusAnuncio,
        data_publicacao: new Date().toISOString(),
        created_at: new Date().toISOString()
      } as Partial<Anuncio>,
      'Anúncio renovado e enviado para o topo dos recentes.'
    );
  }

  async function excluir(ad: AnuncioLinha) {
    const ok = confirm(`Excluir o anúncio "${ad.titulo}"?\n\nEle será removido da busca, da vitrine e da sua lista.`);
    if (!ok) return;
    await atualizarAnuncio(ad.id, { status: 'expirado' as StatusAnuncio, destaque: false, destaque_inicio: null, destaque_fim: null }, 'Anúncio excluído.');
  }

  if (loading) return <div className="card">Carregando...</div>;

  return anuncios.length ? (
    <div className="section">
      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="grid grid-2">
        {anuncios.map((ad) => {
          const foto = capa(ad);
          const isLoading = loadingId === ad.id;
          const podePausar = ad.status === 'aprovado';
          const podeAtivar = ad.status === 'pausado' || ad.status === 'vendido';
          const podeVendido = ad.status === 'aprovado' || ad.status === 'pausado';
          const podeRenovar = ad.status === 'aprovado' || ad.status === 'pausado' || ad.status === 'vendido';
          const pedidoDestaque = solicitacoes[ad.id];
          const destaqueFim = formatarData(ad.destaque_fim);

          return (
            <article className="card" key={ad.id} style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 34%) 1fr', gap: 0, alignItems: 'start' }}>
                <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#eef3ea', display: 'grid', placeItems: 'center', overflow: 'hidden', alignSelf: 'start' }}>
                  {foto ? <img src={foto} alt={ad.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span className="muted">Sem foto</span>}
                </div>

                <div style={{ padding: 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span className={`badge status-${ad.status}`}>{STATUS_LABEL[ad.status] || ad.status}</span>
                    {ad.destaque && <span className="badge"><Sparkles size={14} /> Destaque</span>}
                  </div>

                  <h2 style={{ margin: '10px 0 4px', fontSize: 20, lineHeight: 1.1 }}>{ad.titulo}</h2>
                  <strong className="price">{formatMoney(ad.preco, ad.preco_a_combinar)}</strong>
                  <p className="muted" style={{ margin: '6px 0' }}>{ad.bairro ? `${ad.bairro} - ` : ''}{ad.cidade} - {ad.estado}</p>
                  <p className="muted" style={{ margin: 0 }}>{ad.visualizacoes || 0} views · {ad.cliques_whatsapp || 0} WhatsApp</p>
                </div>
              </div>

              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                {ad.destaque && <div className="notice">Anúncio destacado{destaqueFim ? ` até ${destaqueFim}` : ''}.</div>}
                {!ad.destaque && pedidoDestaque?.status === 'pendente' && <div className="notice">Destaque solicitado por {pedidoDestaque.dias} dias. Aguardando admin.</div>}

                {ad.status === 'aprovado' && !ad.destaque && pedidoDestaque?.status !== 'pendente' && (
                  <div className="card" style={{ background: '#f8faf4' }}>
                    <strong>Destacar anúncio</strong>
                    <p className="muted" style={{ marginTop: 4 }}>Solicite destaque para aparecer acima na busca e na página inicial.</p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {planosDestaque.length ? planosDestaque.map((plano) => (
                        <button key={plano.id} className="btn btn-secondary btn-full" disabled={isLoading} onClick={() => solicitarDestaque(ad, plano)}>
                          {plano.nome} · {formatarPrecoPlano(plano.preco)}
                        </button>
                      )) : <p className="muted">Nenhum plano de destaque ativo.</p>}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Link className="btn btn-secondary" href={`/painel/editar/${ad.id}`}><Pencil size={16} /> Editar</Link>
                  <Link className="btn btn-secondary" href={`/anuncio/${ad.slug}`}><Eye size={16} /> Ver</Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {podePausar && (
                    <button className="btn btn-secondary" disabled={isLoading} onClick={() => pausar(ad)}><Pause size={16} /> Pausar</button>
                  )}
                  {podeAtivar && (
                    <button className="btn btn-primary" disabled={isLoading} onClick={() => ativar(ad)}><Play size={16} /> Ativar</button>
                  )}
                  {podeVendido && (
                    <button className="btn btn-secondary" disabled={isLoading} onClick={() => vendido(ad)}><CheckCircle2 size={16} /> Vendido</button>
                  )}
                  {podeRenovar && (
                    <button className="btn btn-secondary" disabled={isLoading} onClick={() => renovar(ad)}><RefreshCcw size={16} /> Renovar</button>
                  )}
                </div>

                {ad.status === 'recusado' && <div className="notice">Edite o anúncio para enviar novamente para aprovação.</div>}
                {ad.status === 'pendente' && <div className="notice">Aguardando aprovação do administrador.</div>}

                <button className="btn btn-danger btn-full" disabled={isLoading} onClick={() => excluir(ad)}><Trash2 size={16} /> Excluir anúncio</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  ) : <EmptyState title="Você ainda não tem anúncios" description="Crie o primeiro anúncio para começar." />;
}

export default function MeusAnunciosPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div><h1>Meus anúncios</h1><p>Edite, pause, marque como vendido, exclua ou solicite destaque.</p></div>
            <Link className="btn btn-primary" href="/anunciar">Novo anúncio</Link>
          </div>
          <MeusAnuncios />
        </div>
      </main>
    </AuthGuard>
  );
}
