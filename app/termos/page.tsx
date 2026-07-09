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
            O AgroMarket é uma plataforma de divulgação. Não somos parte da negociação entre comprador e vendedor e não garantimos entrega, qualidade, procedência ou documentação dos produtos anunciados.
          </div>

          <div className="form" style={{ marginTop: 18 }}>
            <section>
              <h2>1. O que é o AgroMarket</h2>
              <p>O AgroMarket ajuda pessoas e empresas a divulgarem produtos agro, animais, serviços rurais, máquinas, equipamentos, vitrines e oportunidades. A negociação de produtos anunciados acontece diretamente entre comprador e vendedor, normalmente pelo WhatsApp.</p>
            </section>

            <section>
              <h2>2. Responsabilidade do vendedor</h2>
              <p>O vendedor é responsável por publicar informações verdadeiras, fotos reais, preço correto, quantidade disponível, localização aproximada e contato válido. Também é responsável por cumprir leis, normas sanitárias, fiscais, ambientais e de transporte aplicáveis ao que anuncia.</p>
            </section>

            <section>
              <h2>3. Responsabilidade do comprador</h2>
              <p>O comprador deve conferir todas as informações antes de fechar negócio, negociar com cautela, verificar produto, animal ou serviço e evitar pagamentos antecipados a desconhecidos.</p>
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
              <h2>6. Verificação de perfil</h2>
              <p>Para aumentar a segurança, o AgroMarket pode exigir CPF, documento, selfie/foto e localização real por GPS para publicar anúncios, criar vitrine, contratar patrocinados ou liberar recursos comerciais.</p>
            </section>

            <section>
              <h2>7. Moderação</h2>
              <p>Podemos recusar, pausar, bloquear ou excluir anúncios, vitrines e usuários quando houver denúncia, suspeita de fraude, descumprimento das regras ou risco para compradores e vendedores.</p>
            </section>

            <section>
              <h2>8. Pagamentos da plataforma</h2>
              <p>O AgroMarket pode cobrar por serviços próprios, como mensalidade de vitrine, destaques e banners patrocinados. Esses pagamentos podem ser processados por gateway de pagamento, como Asaas. O AgroMarket não intermedia pagamentos dos produtos anunciados entre comprador e vendedor.</p>
            </section>

            <section>
              <h2>9. Pagamentos e entregas dos produtos</h2>
              <p>Frete, entrega, garantia, devolução, troca e pagamento de produtos anunciados são combinados diretamente entre comprador e vendedor. O AgroMarket não se responsabiliza por acordos feitos fora da plataforma.</p>
            </section>

            <section>
              <h2>10. Privacidade</h2>
              <p>Ao usar o AgroMarket, você concorda com a coleta e tratamento de dados necessários para cadastro, segurança, publicação de anúncios, vitrines, pagamentos da plataforma, denúncias e prevenção de fraude.</p>
            </section>

            <section>
              <h2>11. Denúncias</h2>
              <p>Qualquer pessoa pode denunciar um anúncio. A denúncia será analisada pelo administrador, que poderá pausar ou bloquear o anúncio e, se necessário, bloquear o usuário.</p>
            </section>

            <section>
              <h2>12. Aceite</h2>
              <p>Ao criar conta, publicar anúncio, criar vitrine, gerar pagamento, entrar em contato com vendedor ou navegar no AgroMarket, você declara estar de acordo com estes termos.</p>
            </section>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/anunciar">Criar anúncio</Link>
            <Link className="btn btn-secondary" href="/privacidade">Privacidade</Link>
            <Link className="btn btn-secondary" href="/seguranca">Ver dicas de segurança</Link>
            <Link className="btn btn-secondary" href="/contato">Suporte</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
