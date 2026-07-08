'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { MonetizacaoPlano } from '@/types';

function formatMoney(value: number | string | null | undefined) {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
}

export default function PlanosPage() {
  const [planos, setPlanos] = useState<MonetizacaoPlano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('monetizacao_planos')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      setPlanos((data || []) as MonetizacaoPlano[]);
      setLoading(false);
    }
    load();
  }, []);

  const destaques = planos.filter((plano) => plano.tipo === 'destaque');
  const vitrines = planos.filter((plano) => plano.tipo === 'vitrine' || plano.tipo === 'assinatura');

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 980, margin: '0 auto' }}>
          <span className="badge">Planos e preços</span>
          <h1>Planos AgroMarket</h1>
          <p className="muted">Cadastre grátis no lançamento. Para vender mais rápido, solicite destaque e apareça acima nas buscas.</p>

          <div className="notice">
            Pagamento inicial por PIX/manual. O vendedor solicita destaque, o administrador confirma e libera pelo painel. Os valores abaixo são editados no admin.
          </div>

          <section className="section">
            <h2>Anúncio comum</h2>
            <div className="card" style={{ background: '#f8faf4' }}>
              <h3 style={{ marginTop: 0 }}>Grátis no lançamento</h3>
              <p className="muted">O vendedor pode criar anúncio com foto, descrição, cidade, WhatsApp, vitrine e compartilhamento.</p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Cadastro gratuito.</li>
                <li>Anúncio comum gratuito no período de lançamento.</li>
                <li>Aprovação manual pelo administrador.</li>
                <li>Vitrine liberada gratuitamente no lançamento.</li>
              </ul>
            </div>
          </section>

          <section className="section">
            <h2>Destaque do anúncio</h2>
            {loading ? <div className="card">Carregando planos...</div> : (
              <div className="grid grid-3">
                {destaques.map((plano) => (
                  <div className="card" key={plano.id} style={{ background: '#f8faf4' }}>
                    <span className="badge">Destaque</span>
                    <h3>{plano.nome}</h3>
                    <div className="price" style={{ fontSize: 30 }}>{formatMoney(plano.preco)}</div>
                    <p className="muted">{plano.descricao}</p>
                    <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                      <li>Aparece acima na busca.</li>
                      <li>Recebe selo de destaque.</li>
                      <li>Admin libera manualmente.</li>
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {vitrines.length > 0 && (
            <section className="section">
              <h2>Vitrine e assinatura</h2>
              <div className="grid grid-3">
                {vitrines.map((plano) => (
                  <div className="card" key={plano.id} style={{ background: '#fff' }}>
                    <span className="badge">{plano.tipo}</span>
                    <h3>{plano.nome}</h3>
                    <div className="price" style={{ fontSize: 30 }}>{formatMoney(plano.preco)}</div>
                    <p className="muted">{plano.descricao}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card" style={{ background: '#fff' }}>
            <h2>Como funciona hoje</h2>
            <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Vendedor cria e aprova o anúncio.</li>
              <li>Vendedor solicita destaque no painel.</li>
              <li>Admin combina pagamento por PIX ou gateway configurado.</li>
              <li>Admin aprova o destaque no painel.</li>
              <li>O anúncio passa a aparecer como destaque até a data final.</li>
            </ol>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/painel/anuncios">Solicitar destaque</Link>
            <Link className="btn btn-secondary" href="/regras">Ver regras</Link>
            <Link className="btn btn-secondary" href="/anuncios">Ver anúncios</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
