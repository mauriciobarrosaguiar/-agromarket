import Link from 'next/link';

export default function RegrasPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 920, margin: '0 auto' }}>
          <span className="badge">Regras de lançamento</span>
          <h1>Regras para anunciar no AgroMarket</h1>
          <p className="muted">Estas regras ajudam a manter o marketplace seguro, organizado e confiável para compradores e vendedores.</p>

          <div className="notice">
            Todo anúncio pode ser aprovado, reprovado, pausado ou bloqueado pelo administrador. O AgroMarket apenas divulga os anúncios e não participa da negociação.
          </div>

          <div className="grid grid-2 section">
            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Obrigatório no anúncio</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Foto real do produto, animal, serviço ou máquina.</li>
                <li>Título claro e sem informação enganosa.</li>
                <li>Preço correto ou marcado como a combinar.</li>
                <li>Cidade, estado e bairro quando possível.</li>
                <li>Quantidade, peso, unidade ou medida quando necessário.</li>
                <li>WhatsApp válido e nome do responsável.</li>
              </ul>
            </div>

            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Perfil do divulgador</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Foto/selfie do divulgador é obrigatória.</li>
                <li>Localização real por GPS é obrigatória.</li>
                <li>Documento é opcional neste momento.</li>
                <li>Documento não aparece publicamente.</li>
                <li>Perfil com informação falsa pode ser bloqueado.</li>
              </ul>
            </div>
          </div>

          <section className="card" style={{ background: '#fff' }}>
            <h2>Animais</h2>
            <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Não anuncie animal doente, debilitado ou em condição de maus-tratos.</li>
              <li>Informe espécie, idade aproximada, sexo, quantidade, peso quando houver e condição geral.</li>
              <li>O vendedor é responsável por origem, sanidade, transporte e exigências legais.</li>
              <li>Anúncios com suspeita de irregularidade podem ser pausados ou reprovados.</li>
            </ul>
          </section>

          <section className="card" style={{ background: '#fff', marginTop: 16 }}>
            <h2>Produtos, máquinas e serviços</h2>
            <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
              <li>Não use foto de internet como se fosse do produto real.</li>
              <li>Não anuncie produto proibido por lei, adulterado, furtado ou de origem duvidosa.</li>
              <li>Informe defeitos, avarias, ano/modelo e condições de uso quando houver.</li>
              <li>Serviços devem ter descrição clara, região de atendimento e forma de contato.</li>
            </ul>
          </section>

          <section className="card" style={{ background: '#fff', marginTop: 16 }}>
            <h2>Motivos comuns de reprovação</h2>
            <div className="grid grid-2">
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Sem foto real.</li>
                <li>Preço enganoso.</li>
                <li>Contato inválido.</li>
                <li>Produto ou animal irregular.</li>
              </ul>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Localização suspeita.</li>
                <li>Descrição confusa.</li>
                <li>Imagem falsa ou montagem enganosa.</li>
                <li>Denúncia de golpe ou fraude.</li>
              </ul>
            </div>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn-primary" href="/anunciar">Criar anúncio</Link>
            <Link className="btn btn-secondary" href="/planos">Ver planos</Link>
            <Link className="btn btn-secondary" href="/termos">Termos de uso</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
