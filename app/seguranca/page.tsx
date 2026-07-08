import Link from 'next/link';

export default function SegurancaPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <span className="badge">Compra segura</span>
          <h1>Segurança no AgroMarket</h1>
          <p className="muted">Cuidados rápidos para comprar, vender e negociar pelo WhatsApp.</p>

          <div className="notice">
            O AgroMarket não recebe valores, não intermedia pagamentos e não garante a entrega. A negociação é direta entre comprador e vendedor.
          </div>

          <div className="grid grid-2 section">
            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Para compradores</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Confira fotos reais e peça vídeo se necessário.</li>
                <li>Veja se o preço faz sentido para a região.</li>
                <li>Evite pagar adiantado para desconhecidos.</li>
                <li>Combine retirada em local seguro.</li>
                <li>Confirme quantidade, peso, unidade e estado do produto.</li>
                <li>Em animais, verifique saúde, origem e transporte.</li>
              </ul>
            </div>

            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Para vendedores</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Use fotos reais do produto ou animal.</li>
                <li>Informe preço, quantidade, cidade e bairro corretamente.</li>
                <li>Mantenha o WhatsApp atualizado.</li>
                <li>Pause ou marque como vendido quando acabar.</li>
                <li>Não publique produto proibido ou informação enganosa.</li>
                <li>Responda com clareza e guarde combinados importantes.</li>
              </ul>
            </div>
          </div>

          <section className="card" style={{ background: '#fff' }}>
            <h2>Sinais de alerta</h2>
            <div className="grid grid-2">
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Preço muito abaixo do normal.</li>
                <li>Vendedor apressando pagamento.</li>
                <li>Contato diferente do informado no anúncio.</li>
                <li>Fotos genéricas ou de internet.</li>
              </ul>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Recusa em mandar mais fotos ou vídeos.</li>
                <li>Pedido de sinal sem comprovação.</li>
                <li>Localização confusa ou falsa.</li>
                <li>Produto ou animal em situação irregular.</li>
              </ul>
            </div>
          </section>

          <section className="card" style={{ background: '#fff', marginTop: 16 }}>
            <h2>Viu algo errado?</h2>
            <p>Abra o anúncio e toque em <strong>Denunciar anúncio</strong>. O administrador poderá pausar, bloquear ou remover o anúncio.</p>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/anuncios">Buscar anúncios</Link>
            <Link className="btn btn-secondary" href="/termos">Ver termos de uso</Link>
            <Link className="btn btn-secondary" href="/">Voltar ao início</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
