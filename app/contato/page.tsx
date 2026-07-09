import Link from 'next/link';
import { MessageCircle, ShieldCheck } from 'lucide-react';

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export default function ContatoPage() {
  const suporte = onlyNumbers(process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE);
  const texto = encodeURIComponent('Olá, preciso de suporte no AgroMarket.');
  const whatsappUrl = suporte ? `https://wa.me/${suporte}?text=${texto}` : '';

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
          <span className="badge"><MessageCircle size={14} /> Suporte</span>
          <h1>Contato AgroMarket</h1>
          <p className="muted">Use este canal para suporte sobre cadastro, anúncios, vitrines, pagamentos e denúncias.</p>

          <div className="notice">
            O suporte do AgroMarket ajuda com o uso da plataforma. Negociação, entrega e pagamento dos produtos anunciados continuam sendo responsabilidade direta de comprador e vendedor.
          </div>

          <div className="grid grid-2 section">
            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Falar no WhatsApp</h2>
              <p className="muted">Canal recomendado para dúvidas rápidas, análise de erro, pagamento de vitrine e problemas com anúncios.</p>
              {whatsappUrl ? (
                <a className="btn btn-whatsapp btn-full" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Abrir suporte</a>
              ) : (
                <div className="notice">WhatsApp de suporte ainda não configurado. Configure NEXT_PUBLIC_WHATSAPP_SUPORTE na Vercel.</div>
              )}
            </div>

            <div className="card" style={{ background: '#f8faf4' }}>
              <h2>Antes de pedir suporte</h2>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Envie print do erro.</li>
                <li>Informe o e-mail da conta.</li>
                <li>Diga se está no celular, navegador ou app instalado.</li>
                <li>Em pagamento, informe se o Pix já foi pago.</li>
              </ul>
            </div>
          </div>

          <section className="card" style={{ background: '#fff' }}>
            <span className="badge"><ShieldCheck size={14} /> Segurança</span>
            <h2>Denúncias e anúncios suspeitos</h2>
            <p>Ao encontrar anúncio suspeito, abra o anúncio e toque em <strong>Denunciar anúncio</strong>. O administrador poderá analisar e bloquear o anúncio ou usuário.</p>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            {whatsappUrl && <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Falar com suporte</a>}
            <Link className="btn btn-secondary" href="/seguranca">Ver segurança</Link>
            <Link className="btn btn-secondary" href="/regras">Ver regras</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
