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
  const titulo = cleanText(anuncio?.titulo || SITE_NAME, 54);
  const descricao = cleanText(anuncio?.descricao || 'Produtos e servicos do agro perto de voce.', 88);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#f8f3e6',
          color: '#062b19',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: 384,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#062b19',
            color: '#ffffff',
            padding: '22px 26px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                background: '#f6b526',
                color: '#062b19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 900,
                marginRight: 12
              }}
            >
              Ag
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{SITE_NAME}</div>
              <div style={{ fontSize: 13, color: '#f6d16c' }}>Anuncio do agro perto de voce</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 38, lineHeight: 1.02, fontWeight: 900, marginBottom: 12 }}>{titulo}</div>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: '#f6b526',
                color: '#062b19',
                borderRadius: 14,
                padding: '7px 12px',
                fontSize: 24,
                fontWeight: 900,
                marginBottom: 10
              }}
            >
              {preco}
            </div>
            <div style={{ fontSize: 15, color: '#e8f4df', fontWeight: 800, marginBottom: 8 }}>{local}</div>
            <div style={{ fontSize: 15, lineHeight: 1.25, color: 'rgba(255,255,255,.88)' }}>{descricao}</div>
          </div>

          <div style={{ fontSize: 13, color: '#f6d16c', fontWeight: 800 }}>meuagromarket.com.br</div>
        </div>

        <div
          style={{
            width: 216,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18
          }}
        >
          <img
            src={foto}
            alt=""
            style={{
              width: 178,
              height: 178,
              objectFit: 'cover',
              borderRadius: 22,
              border: '6px solid #ffffff'
            }}
          />
          <div
            style={{
              display: 'flex',
              marginTop: 12,
              background: '#ffffff',
              borderRadius: 16,
              padding: '9px 12px',
              color: '#14532d',
              fontSize: 15,
              fontWeight: 900,
              textAlign: 'center'
            }}
          >
            Contato direto pelo WhatsApp
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 315,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
      }
    }
  );
}
