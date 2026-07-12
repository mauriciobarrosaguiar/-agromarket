import { ImageResponse } from 'next/og';
import { cleanText, createSeoSupabaseClient, DEFAULT_IMAGE, formatMoneySeo, getAbsoluteUrl, SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function imagemFallback() {
  return getAbsoluteUrl(DEFAULT_IMAGE);
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const supabase = createSeoSupabaseClient();

  const { data } = await supabase
    .from('anuncios')
    .select('titulo, descricao, preco, preco_a_combinar, cidade, estado, bairro, slug, status, fotos_anuncios(url_foto, principal, ordem)')
    .eq('slug', slug)
    .eq('status', 'aprovado')
    .maybeSingle();

  const anuncio = data as any;
  const fotos = [...(anuncio?.fotos_anuncios || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
  const foto = fotos.find((item: any) => item.principal)?.url_foto || fotos[0]?.url_foto || imagemFallback();
  const preco = anuncio ? formatMoneySeo(anuncio.preco, Boolean(anuncio.preco_a_combinar)) : 'AgroMarket';
  const local = anuncio ? `${anuncio.bairro ? `${anuncio.bairro} - ` : ''}${anuncio.cidade} - ${anuncio.estado}` : 'O agro da regiao em um so lugar';
  const titulo = cleanText(anuncio?.titulo || SITE_NAME, 72);
  const descricao = cleanText(anuncio?.descricao || 'Produtos e servicos do agro perto de voce.', 120);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#062b19',
          color: '#ffffff',
          overflow: 'hidden'
        }}
      >
        <img
          src={foto}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(6,43,25,.94) 0%, rgba(6,43,25,.78) 42%, rgba(6,43,25,.12) 100%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 58,
            right: 58,
            bottom: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                background: '#f6b526',
                color: '#062b19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                fontWeight: 900,
                marginRight: 18
              }}
            >
              Ag
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 38, fontWeight: 900 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 22, color: '#f6d16c' }}>Anuncio do agro perto de voce</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: 720 }}>
            <div style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 900, marginBottom: 18 }}>{titulo}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  background: '#f6b526',
                  color: '#062b19',
                  borderRadius: 18,
                  padding: '14px 22px',
                  fontSize: 38,
                  fontWeight: 900,
                  marginRight: 18
                }}
              >
                {preco}
              </div>
              <div style={{ fontSize: 26, color: '#ffffff', fontWeight: 800 }}>{local}</div>
            </div>
            <div style={{ fontSize: 26, lineHeight: 1.25, color: 'rgba(255,255,255,.88)' }}>{descricao}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
      }
    }
  );
}
