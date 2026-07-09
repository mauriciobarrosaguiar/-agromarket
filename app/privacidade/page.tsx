import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 920, margin: '0 auto' }}>
          <span className="badge">Privacidade</span>
          <h1>Política de privacidade</h1>
          <p className="muted">Como o AgroMarket usa dados para cadastro, segurança, anúncios, vitrines e pagamentos.</p>

          <div className="notice">
            O AgroMarket coleta somente os dados necessários para identificar usuários, publicar anúncios, evitar golpes, permitir contato entre comprador e vendedor e processar cobranças de serviços da plataforma.
          </div>

          <div className="form" style={{ marginTop: 18 }}>
            <section>
              <h2>1. Dados que podemos coletar</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Nome, e-mail, WhatsApp, cidade e estado.</li>
                <li>CPF, dados do documento, foto/selfie e arquivo de documento para verificação.</li>
                <li>Localização aproximada por GPS para anúncios, segurança e busca por proximidade.</li>
                <li>Informações publicadas em anúncios, vitrines, avaliações, cliques e denúncias.</li>
                <li>Dados de pagamento de serviços do AgroMarket, como mensalidade de vitrine e patrocinados.</li>
              </ul>
            </section>

            <section>
              <h2>2. Para que usamos os dados</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Criar e proteger a conta do usuário.</li>
                <li>Validar identidade, documento e localização.</li>
                <li>Publicar anúncios e vitrines.</li>
                <li>Conectar comprador e vendedor pelo WhatsApp.</li>
                <li>Registrar cliques, pagamentos, denúncias e ações administrativas.</li>
                <li>Evitar fraude, golpe, anúncios falsos e uso irregular da plataforma.</li>
              </ul>
            </section>

            <section>
              <h2>3. O que aparece publicamente</h2>
              <p>Podem aparecer publicamente: nome da vitrine, cidade, estado, descrição, fotos, produtos, avaliações e WhatsApp informado para contato. CPF, documento, arquivo de documento e selfie de verificação não ficam públicos.</p>
            </section>

            <section>
              <h2>4. Pagamentos</h2>
              <p>Pagamentos de mensalidade de vitrine e serviços do AgroMarket podem ser processados por gateway de pagamento, como Asaas. O AgroMarket não recebe pagamentos de produtos vendidos entre comprador e vendedor; essas negociações são feitas diretamente entre as partes.</p>
            </section>

            <section>
              <h2>5. Compartilhamento de dados</h2>
              <p>Podemos compartilhar dados somente quando necessário para funcionamento do app, processamento de pagamento, segurança, cumprimento legal, análise de denúncia ou proteção contra fraude.</p>
            </section>

            <section>
              <h2>6. Segurança</h2>
              <p>Arquivos sensíveis, como documentos, devem ser tratados como privados. O administrador pode analisar documentos e denúncias para proteger a comunidade.</p>
            </section>

            <section>
              <h2>7. Solicitações do usuário</h2>
              <p>O usuário pode solicitar correção, atualização ou exclusão de dados pelo canal de suporte, respeitando obrigações legais, registros de segurança e histórico necessário para prevenção de fraude.</p>
            </section>

            <section>
              <h2>8. Aceite</h2>
              <p>Ao criar conta, publicar anúncio, criar vitrine, gerar pagamento ou usar o AgroMarket, o usuário declara estar ciente desta política de privacidade.</p>
            </section>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/contato">Falar com suporte</Link>
            <Link className="btn btn-secondary" href="/termos">Termos de uso</Link>
            <Link className="btn btn-secondary" href="/regras">Regras</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
