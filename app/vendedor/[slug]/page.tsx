import type { Metadata } from 'next';
import { Suspense } from 'react';
import VendedorClient from './VendedorClient';
import { cleanText, createSeoSupabaseClient, DEFAULT_IMAGE, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSeoSupabaseClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('vitrines')
    .select('nome_vitrine, descricao, cidade, estado, slug, foto_url, banner_url, vitrine_ativa, assinatura_status, assinatura_vencimento')
    .eq('slug', slug)
    .eq('vitrine_ativa', true)
    .eq('assinatura_status', 'ativa')
    .gte('assinatura_vencimento', hoje)
    .maybeSingle();

  if (!data) {
    return {
      title: `Vitrine não encontrada - ${SITE_NAME}`,
      description: 'Vitrine não encontrada, vencida ou indisponível no AgroMarket.',
      metadataBase: new URL(getSiteUrl())
    };
  }

  const vitrine = data as any;
  const title = `Vitrine AgroMarket: ${vitrine.nome_vitrine}`;
  const local = `${vitrine.cidade || 'Cidade não informada'} - ${vitrine.estado || 'UF'}`;
  const description = cleanText(`${local}. ${vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.'}`, 180);
  const url = getAbsoluteUrl(`/vendedor/${vitrine.slug}`);
  const imageUrl = getAbsoluteUrl(vitrine.banner_url || vitrine.foto_url || DEFAULT_IMAGE);

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
          alt: vitrine.nome_vitrine
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

export default function VendedorPage() {
  return (
    <Suspense fallback={<main className="page"><div className="container"><div className="card">Carregando vitrine...</div></div></main>}>
      <VendedorClient />
    </Suspense>
  );
}
