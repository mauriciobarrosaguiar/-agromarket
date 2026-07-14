import type { Metadata } from 'next';
import AnuncioDetalheClient from './AnuncioDetalheClient';
import { cleanText, createSeoSupabaseClient, formatMoneySeo, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function primeiroParametro(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = createSeoSupabaseClient();

  const { data } = await supabase
    .from('anuncios')
    .select('titulo, descricao, preco, preco_a_combinar, cidade, estado, bairro, slug, status, updated_at, fotos_anuncios(id, url_foto, principal, ordem)')
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
  const foto = fotos.find((f: any) => f.principal) || fotos[0] || null;
  const preco = formatMoneySeo(anuncio.preco, Boolean(anuncio.preco_a_combinar));
  const local = `${anuncio.bairro ? `${anuncio.bairro} - ` : ''}${anuncio.cidade} - ${anuncio.estado}`;
  const title = `${anuncio.titulo} - ${preco}`;
  const description = cleanText(`${preco} • ${local}. ${anuncio.descricao}`, 180);
  const canonicalUrl = getAbsoluteUrl(`/anuncio/${anuncio.slug}`);
  const requestedVersion = primeiroParametro(query.v);
  const imageVersion = encodeURIComponent(String(requestedVersion || foto?.id || anuncio.updated_at || anuncio.slug));
  const imageUrl = getAbsoluteUrl(`/api/og/anuncio/${anuncio.slug}?v=${imageVersion}`);
  const sharedUrl = primeiroParametro(query.share) === 'whatsapp'
    ? getAbsoluteUrl(`/anuncio/${anuncio.slug}?share=whatsapp&v=${imageVersion}`)
    : canonicalUrl;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: sharedUrl,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'pt_BR',
      images: [
        {
          url: imageUrl,
          width: 600,
          height: 315,
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
