import type { Metadata } from 'next';
import AnuncioDetalheClient from './AnuncioDetalheClient';
import { cleanText, createSeoSupabaseClient, DEFAULT_IMAGE, formatMoneySeo, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSeoSupabaseClient();

  const { data } = await supabase
    .from('anuncios')
    .select('titulo, descricao, preco, preco_a_combinar, cidade, estado, bairro, slug, status, fotos_anuncios(url_foto, principal, ordem)')
    .eq('slug', slug)
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!data) {
    return {
      title: `Anúncio não encontrado - ${SITE_NAME}`,
      description: 'Anúncio não encontrado ou indisponível no AgroMarket.',
      metadataBase: new URL(getSiteUrl())
    };
  }

  const anuncio = data as any;
  const fotos = [...(anuncio.fotos_anuncios || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
  const foto = fotos.find((f: any) => f.principal)?.url_foto || fotos[0]?.url_foto || DEFAULT_IMAGE;
  const preco = formatMoneySeo(anuncio.preco, Boolean(anuncio.preco_a_combinar));
  const local = `${anuncio.bairro ? `${anuncio.bairro} - ` : ''}${anuncio.cidade} - ${anuncio.estado}`;
  const title = `${anuncio.titulo} - ${preco}`;
  const description = cleanText(`${preco} • ${local}. ${anuncio.descricao}`, 180);
  const url = getAbsoluteUrl(`/anuncio/${anuncio.slug}`);
  const imageUrl = getAbsoluteUrl(foto);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'pt_BR',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: anuncio.titulo
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default function AnuncioPage() {
  return <AnuncioDetalheClient />;
}
