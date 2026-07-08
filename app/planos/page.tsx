import Link from 'next/link';

const PLANOS_DESTAQUE = [
  { nome: 'Destaque 7 dias', preco: 'R$ 9,90', descricao: 'Ideal para vender rápido um produto, animal ou serviço.' },
  { nome: 'Destaque 15 dias', preco: 'R$ 17,90', descricao: 'Mais tempo aparecendo acima nos anúncios.' },
  { nome: 'Destaque 30 dias', preco: 'R$ 29,90', descricao: 'Melhor opção para máquinas, serviços e lotes maiores.' }
];

export default function PlanosPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 980, margin: '0 auto' }}>
          <span className="badge">Monetização inicial</span>
          <h1>Planos AgroMarket</h1>
          <p className="muted">No lançamento, o cadastro e os anúncios comuns ficam grátis. A monetização começa com destaque manual liberado pelo administrador.</p>

          <div className="notice">
            MVP de lançamento: pagamento por PIX manual. O vendedor solicita destaque, o administrador confirma o pagamento e libera o anúncio pelo painel admin.
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
            <div className="grid grid-3">
              {PLANOS_DESTAQUE.map((plano) => (
                <div className="card" key={plano.nome} style={{ background: '#f8faf4' }}>
                  <span className="badge">Destaque</span>
                  <h3>{plano.nome}</h3>
                  <div className="price" style={{ fontSize: 30 }}>{plano.preco}</div>
                  <p className="muted">{plano.descricao}</p>
                  <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                    <li>Aparece acima na busca.</li>
                    <li>Recebe selo de destaque.</li>
                    <li>Admin libera manualmente.</li>
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ background: '#fff' }}>
            <h2>Como funciona hoje</h2>
            <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Vendedor cria e aprova o anúncio.</li>
              <li>Vendedor solicita destaque por 7, 15 ou 30 dias.</li>
              <li>Admin combina pagamento por PIX manual.</li>
              <li>Admin aprova o destaque no painel.</li>
              <li>O anúncio passa a aparecer como destaque até a data final.</li>
            </ol>
          </section>

          <section className="card" style={{ background: '#fff', marginTop: 16 }}>
            <h2>Próxima etapa</h2>
            <p>Depois do teste beta, podemos adicionar PIX automático, comprovante, vencimento automático e plano premium da vitrine.</p>
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
