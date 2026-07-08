import Link from 'next/link';

export default function TermosPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <span className="badge">AgroMarket</span>
          <h1>Termos de uso</h1>
          <p className="muted">Regras simples para usar o AgroMarket com responsabilidade.</p>

          <div className="notice">
            O AgroMarket é uma plataforma de divulgação. Não somos parte da negociação, não recebemos pagamento em nome do vendedor e não garantimos entrega, qualidade, procedência ou documentação dos produtos anunciados.
          </div>

          <div className="form" style={{ marginTop: 18 }}>
            <section>
              <h2>1. O que é o AgroMarket</h2>
              <p>O AgroMarket ajuda pessoas e empresas a divulgarem produtos agro, animais, serviços rurais, máquinas, equipamentos e oportunidades. A negociação acontece diretamente entre comprador e vendedor, normalmente pelo WhatsApp.</p>
            </section>

            <section>
              <h2>2. Responsabilidade do vendedor</h2>
              <p>O vendedor é responsável por publicar informações verdadeiras, fotos reais, preço correto, quantidade disponível, localização aproximada e contato válido. Também é responsável por cumprir leis, normas sanitárias, fiscais, ambientais e de transporte aplicáveis ao que anuncia.</p>
            </section>

            <section>
              <h2>3. Responsabilidade do comprador</h2>
              <p>O comprador deve conferir todas as informações antes de fechar negócio, negociar com cautela, verificar produto/animal/serviço e evitar pagamentos antecipados a desconhecidos.</p>
            </section>

            <section>
              <h2>4. Anúncios proibidos</h2>
              <p>Não aceitamos anúncios com golpe, fraude, imagem falsa, produto ilegal, conteúdo ofensivo, informação enganosa, animais em situação irregular, venda proibida por lei ou qualquer item que coloque pessoas, animais ou propriedades em risco.</p>
            </section>

            <section>
              <h2>5. Animais</h2>
              <p>Anúncios de animais devem respeitar bem-estar animal, transporte adequado, origem responsável e condições sanitárias. O vendedor deve informar de forma clara idade, sexo, quantidade, estado de saúde e demais detalhes relevantes.</p>
            </section>

            <section>
              <h2>6. Moderação</h2>
              <p>Podemos recusar, pausar, bloquear ou excluir anúncios e usuários quando houver denúncia, suspeita de fraude, descumprimento das regras ou risco para compradores e vendedores.</p>
            </section>

            <section>
              <h2>7. Pagamentos e entregas</h2>
              <p>O AgroMarket não intermedia pagamentos, frete, entrega, garantia, devolução ou troca. Qualquer acordo deve ser feito diretamente entre as partes.</p>
            </section>

            <section>
              <h2>8. Denúncias</h2>
              <p>Qualquer pessoa pode denunciar um anúncio. A denúncia será analisada pelo administrador, que poderá pausar ou bloquear o anúncio e, se necessário, bloquear o usuário.</p>
            </section>

            <section>
              <h2>9. Aceite</h2>
              <p>Ao criar conta, publicar anúncio, entrar em contato com vendedor ou navegar no AgroMarket, você declara estar de acordo com estes termos.</p>
            </section>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/anunciar">Criar anúncio</Link>
            <Link className="btn btn-secondary" href="/seguranca">Ver dicas de segurança</Link>
            <Link className="btn btn-secondary" href="/">Voltar ao início</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
