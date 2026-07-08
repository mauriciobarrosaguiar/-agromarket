import type { Metadata } from 'next';
import { cleanText, createSeoSupabaseClient, DEFAULT_IMAGE, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/seo';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSeoSupabaseClient();

  const { data } = await supabase
    .from('vitrines')
    .select('nome_vitrine, descricao, cidade, estado, slug, foto_url, banner_url, vitrine_ativa, usuarios(nome)')
    .eq('slug', slug)
    .eq('vitrine_ativa', true)
    .maybeSingle();

  if (!data) {
    return {
      title: `Vitrine não encontrada - ${SITE_NAME}`,
      description: 'Vitrine não encontrada ou indisponível no AgroMarket.',
      metadataBase: new URL(getSiteUrl())
    };
  }

  const title = `Vitrine AgroMarket: ${(data as any).nome_vitrine}`;
  const local = `${(data as any).cidade || 'Cidade não informada'} - ${(data as any).estado || 'UF'}`;
  const description = cleanText(`${local}. ${(data as any).descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.'}`, 180);
  const url = getAbsoluteUrl(`/vendedor/${(data as any).slug}`);
  const imageUrl = getAbsoluteUrl((data as any).banner_url || (data as any).foto_url || DEFAULT_IMAGE);

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
      type: 'profile',
      locale: 'pt_BR',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: (data as any).nome_vitrine
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

export default function VendedorLayout({ children }: LayoutProps) {
  return children;
}
