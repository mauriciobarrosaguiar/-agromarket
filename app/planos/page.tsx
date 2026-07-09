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
          <p className="muted">Cadastre grátis no lançamento. Para vender mais rápido, solicite destaque, vitrine ou patrocinado e apareça melhor no app.</p>

          <div className="notice">
            Pagamentos são processados conforme o gateway configurado no AgroMarket. Após a confirmação, o administrador aprova e libera o benefício no painel.
          </div>

          <section className="section">
            <h2>Anúncio comum</h2>
            <div className="card" style={{ background: '#f8faf4' }}>
              <h3 style={{ marginTop: 0 }}>Anuncie Grátis</h3>
              <p className="muted">O vendedor pode criar anúncio com foto, descrição, cidade, WhatsApp, vitrine e compartilhamento.</p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Cadastro gratuito.</li>
                <li>Anúncio comum gratuito no período de lançamento.</li>
                <li>Aprovação pelo administrador.</li>
                <li>Lojinha opcional com mensalidade ou liberação administrativa.</li>
              </ul>
            </div>
          </section>

          <section className="section">
            <h2>Regras para lojinha</h2>
            <div className="card" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <h3 style={{ marginTop: 0 }}>Documento precisa ser aprovado</h3>
              <p className="muted">Enviar arquivo não libera a lojinha automaticamente. O documento fica em análise e o administrador precisa aprovar manualmente.</p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Selfie/foto do responsável.</li>
                <li>CPF e dados do documento preenchidos.</li>
                <li>Arquivo do documento enviado para conferência.</li>
                <li>Documento aprovado pelo administrador.</li>
                <li>Localização real validada por GPS preciso.</li>
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
                      <li>Liberação após aprovação.</li>
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
            <h2>Como funciona</h2>
            <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Vendedor cria anúncio, vitrine ou solicitação de destaque.</li>
              <li>O sistema registra a solicitação no painel.</li>
              <li>Pagamento segue o gateway configurado pelo AgroMarket.</li>
              <li>Admin aprova documento, pagamento e benefício quando necessário.</li>
              <li>O anúncio, vitrine ou banner passa a aparecer pelo período contratado.</li>
            </ol>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/painel/anuncios">Solicitar destaque</Link>
            <Link className="btn btn-secondary" href="/painel/patrocinado">Solicitar patrocinado</Link>
            <Link className="btn btn-secondary" href="/painel/vitrine">Minha vitrine</Link>
            <Link className="btn btn-secondary" href="/regras">Ver regras</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
