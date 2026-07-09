'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ExternalLink, MessageCircle, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PatrocinadoHome } from '@/types';
import EmptyState from '@/components/EmptyState';

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function destinoValido(item: PatrocinadoHome) {
  const telefone = onlyNumbers(item.whatsapp_anunciante);
  if (telefone) {
    const texto = `Olá, vi o patrocinado no AgroMarket e tenho interesse: ${item.titulo}`;
    return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
  }

  if (item.link_url) return item.link_url;
  return '#';
}

export default function PatrocinadosPage() {
  const [itens, setItens] = useState<PatrocinadoHome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('patrocinados_home')
        .select('*')
        .eq('ativo', true)
        .eq('status', 'aprovado')
        .or(`inicio_em.is.null,inicio_em.lte.${hoje}`)
        .or(`fim_em.is.null,fim_em.gte.${hoje}`)
        .order('ordem')
        .order('created_at', { ascending: false });

      setItens((data || []) as PatrocinadoHome[]);
      setLoading(false);
    }

    load();
  }, []);

  async function registrarClique(item: PatrocinadoHome) {
    await supabase.rpc('incrementar_patrocinado_clique', { patrocinado_uuid: item.id });
  }

  return (
    <main className="page">
      <div className="container">
        <Link href="/" className="muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 14 }}><ChevronLeft size={18} /> Voltar</Link>
        <div className="section-head">
          <div>
            <h1>Patrocinados</h1>
            <p>Ofertas, parceiros e marcas em destaque no AgroMarket.</p>
          </div>
          <Link className="btn btn-primary" href="/painel/patrocinado"><PlusCircle size={18} /> Criar patrocinado</Link>
        </div>

        <div className="notice" style={{ marginBottom: 16 }}>
          Para aparecer aqui e na página inicial, o vendedor solicita o banner, realiza o pagamento pelo gateway configurado e o patrocinado fica liberado após confirmação/aprovação.
        </div>

        {loading ? <div className="card">Carregando patrocinados...</div> : itens.length ? (
          <div className="grid grid-2">
            {itens.map((item) => {
              const href = destinoValido(item);
              const externo = href.startsWith('http');
              const temWhatsapp = Boolean(onlyNumbers(item.whatsapp_anunciante));
              return (
                <a
                  key={item.id}
                  href={href}
                  target={externo ? '_blank' : undefined}
                  rel={externo ? 'noreferrer' : undefined}
                  onClick={() => registrarClique(item)}
                  className="card"
                  style={{ padding: 0, overflow: 'hidden', textDecoration: 'none' }}
                >
                  <img src={item.imagem_url} alt={item.titulo} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: '#e8efe2' }} />
                  <div style={{ padding: 14 }}>
                    <strong>{item.titulo}</strong>
                    {item.subtitulo && <p className="muted">{item.subtitulo}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {item.nome_anunciante && <span className="badge">{item.nome_anunciante}</span>}
                      {(item.cidade || item.estado) && <span className="badge">{item.cidade || 'Cidade'} - {item.estado || 'UF'}</span>}
                      {temWhatsapp ? <span className="badge"><MessageCircle size={14} /> WhatsApp</span> : item.link_url && <span className="badge"><ExternalLink size={14} /> Abrir</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : <EmptyState title="Nenhum patrocinado ativo" description="Volte em breve para ver ofertas e parceiros." />}
      </div>
    </main>
  );
}
