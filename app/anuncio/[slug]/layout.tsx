import type { Metadata } from 'next';
import { cleanText, createSeoSupabaseClient, DEFAULT_IMAGE, formatMoneySeo, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/seo';

type ParamsProps = {
  params: Promise<{ slug: string }>;
};

type LayoutProps = ParamsProps & {
  children: React.ReactNode;
};

export async function generateMetadata({ params }: ParamsProps): Promise<Metadata> {
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

  const fotos = [...((data as any).fotos_anuncios || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
  const foto = fotos.find((f: any) => f.principal)?.url_foto || fotos[0]?.url_foto || DEFAULT_IMAGE;
  const preco = formatMoneySeo((data as any).preco, Boolean((data as any).preco_a_combinar));
  const local = `${(data as any).bairro ? `${(data as any).bairro} - ` : ''}${(data as any).cidade} - ${(data as any).estado}`;
  const title = `${(data as any).titulo} - ${preco}`;
  const description = cleanText(`${preco} • ${local}. ${(data as any).descricao}`, 180);
  const url = getAbsoluteUrl(`/anuncio/${(data as any).slug}`);
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
          alt: (data as any).titulo
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

export default function AnuncioLayout({ children }: LayoutProps) {
  return children;
}
