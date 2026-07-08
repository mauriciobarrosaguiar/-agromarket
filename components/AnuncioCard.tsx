import Link from 'next/link';
import { MapPin, MessageCircle } from 'lucide-react';
import type { Anuncio } from '@/types';
import { formatMoney, makeWhatsAppLink } from '@/lib/whatsapp';

export default function AnuncioCard({ anuncio }: { anuncio: Anuncio }) {
  const foto = anuncio.fotos_anuncios?.find((f) => f.principal)?.url_foto || anuncio.fotos_anuncios?.[0]?.url_foto;
  const whats = makeWhatsAppLink(anuncio.whatsapp, anuncio.titulo);

  return (
    <article className="card ad-card">
      <Link href={`/anuncio/${anuncio.slug}`} className="ad-image">
        {foto ? <img src={foto} alt={anuncio.titulo} /> : <span>Sem foto</span>}
      </Link>

      <div className="ad-body">
        <div className="ad-topline">
          <span className="ad-category">{anuncio.categorias?.nome || anuncio.tipo_anuncio}</span>
          {anuncio.destaque && <span className="badge">Destaque</span>}
        </div>

        <p className="ad-title"><Link href={`/anuncio/${anuncio.slug}`}>{anuncio.titulo}</Link></p>
        <div className="price">{formatMoney(anuncio.preco, anuncio.preco_a_combinar)}</div>

        <p className="ad-location">
          <MapPin size={15} /> {anuncio.cidade} - {anuncio.estado}
        </p>

        <div className="ad-actions">
          <Link className="btn btn-secondary" href={`/anuncio/${anuncio.slug}`}>Detalhes</Link>
          <a className="btn btn-whatsapp" href={whats} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
        </div>
      </div>
    </article>
  );
}
