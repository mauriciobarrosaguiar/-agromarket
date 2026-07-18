import { ImageResponse } from 'next/og';
import { cleanText, createSeoSupabaseClient, formatMoneySeo, SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function prepararDados(anuncio: any) {
  const preco = anuncio ? formatMoneySeo(anuncio.preco, Boolean(anuncio.preco_a_combinar)) : 'AgroMarket';
  const local = anuncio ? `${anuncio.bairro ? `${anuncio.bairro} - ` : ''}${anuncio.cidade} - ${anuncio.estado}` : 'O agro da regiao em um so lugar';
  const titulo = cleanText(anuncio?.titulo || SITE_NAME, 62);
  const descricao = cleanText(anuncio?.descricao || 'Produtos e servicos do agro perto de voce.', 170);

  return { preco, local, titulo, descricao };
}

function Logo({ escuro = false }: { escuro?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 37,
          background: '#f6b526',
          color: '#062b19',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 900,
          marginRight: 18
        }}
      >
        Ag
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: escuro ? '#062b19' : '#ffffff' }}>{SITE_NAME}</div>
        <div style={{ fontSize: 20, color: escuro ? '#2f6b4c' : '#f6d16c', fontWeight: 700 }}>Compre e venda no agro perto de voce</div>
      </div>
    </div>
  );
}

function FotoDecorativa({ titulo }: { titulo: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b4d2b 0%, #256d3f 55%, #f6b526 100%)',
        color: '#ffffff',
        textAlign: 'center',
        padding: 34
      }}
    >
      <div style={{ fontSize: 82, marginBottom: 18 }}>🌱</div>
      <div style={{ fontSize: 44, lineHeight: 1.08, fontWeight: 900 }}>{titulo}</div>
      <div style={{ marginTop: 22, fontSize: 26, fontWeight: 800, color: '#fde68a' }}>Anuncio do agro perto de voce</div>
    </div>
  );
}

function ImagemVertical({ titulo, preco, local, descricao }: { titulo: string; preco: string; local: string; descricao: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8f3e6',
        color: '#062b19',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '48px 56px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo escuro />
        <div style={{ background: '#062b19', color: '#ffffff', borderRadius: 999, padding: '14px 24px', fontSize: 24, fontWeight: 900 }}>Anuncio do agro</div>
      </div>

      <div style={{ padding: '0 56px', display: 'flex' }}>
        <div
          style={{
            width: '100%',
            height: 500,
            borderRadius: 46,
            overflow: 'hidden',
            border: '14px solid #ffffff',
            background: '#dfe8d6'
          }}
        >
          <FotoDecorativa titulo={titulo} />
        </div>
      </div>

      <div style={{ padding: '36px 56px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 78, lineHeight: 0.98, fontWeight: 900, letterSpacing: -3, marginBottom: 24 }}>{titulo}</div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', background: '#f6b526', color: '#062b19', borderRadius: 24, padding: '16px 28px', fontSize: 52, fontWeight: 900 }}>{preco}</div>
          <div style={{ display: 'flex', color: '#24583e', fontSize: 32, fontWeight: 900 }}>{local}</div>
        </div>
        <div style={{ fontSize: 35, lineHeight: 1.22, color: '#244533', fontWeight: 600 }}>{descricao}</div>
      </div>

      <div style={{ margin: 'auto 56px 46px', display: 'flex', gap: 22 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#062b19', color: '#ffffff', borderRadius: 30, padding: '28px 22px', fontSize: 34, fontWeight: 900 }}>Contato direto pelo WhatsApp</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: '#062b19', borderRadius: 30, padding: '28px 22px', fontSize: 34, fontWeight: 900 }}>meuagromarket.com.br</div>
      </div>
    </div>
  );
}

function ImagemHorizontal({ titulo, preco, local, descricao }: { titulo: string; preco: string; local: string; descricao: string }) {
  return (
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
          width: 650,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#062b19',
          color: '#ffffff',
          padding: '48px 54px'
        }}
      >
        <Logo />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 74, lineHeight: 0.98, fontWeight: 900, marginBottom: 22 }}>{titulo}</div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#f6b526',
              color: '#062b19',
              borderRadius: 24,
              padding: '14px 26px',
              fontSize: 44,
              fontWeight: 900,
              marginBottom: 18
            }}
          >
            {preco}
          </div>
          <div style={{ fontSize: 27, color: '#e8f4df', fontWeight: 800, marginBottom: 14 }}>{local}</div>
          <div style={{ fontSize: 25, lineHeight: 1.25, color: 'rgba(255,255,255,.88)' }}>{cleanText(descricao, 110)}</div>
        </div>

        <div style={{ fontSize: 24, color: '#f6d16c', fontWeight: 900 }}>meuagromarket.com.br</div>
      </div>

      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 44
        }}
      >
        <div
          style={{
            width: 430,
            height: 340,
            objectFit: 'cover',
            borderRadius: 38,
            border: '12px solid #ffffff',
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          <FotoDecorativa titulo={titulo} />
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            background: '#ffffff',
            borderRadius: 24,
            padding: '22px 30px',
            color: '#14532d',
            fontSize: 31,
            fontWeight: 900,
            textAlign: 'center'
          }}
        >
          Contato direto pelo WhatsApp
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const params = new URL(request.url).searchParams;
  const formato = params.get('formato');
  const supabase = createSeoSupabaseClient();

  const { data } = await supabase
    .from('anuncios')
    .select('titulo, descricao, preco, preco_a_combinar, cidade, estado, bairro, slug, status')
    .eq('slug', slug)
    .eq('status', 'aprovado')
    .maybeSingle();

  const dados = prepararDados(data as any);
  const vertical = formato === 'compartilhar';

  return new ImageResponse(vertical ? <ImagemVertical {...dados} /> : <ImagemHorizontal {...dados} />, {
    width: vertical ? 1080 : 1200,
    height: vertical ? 1350 : 630,
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
