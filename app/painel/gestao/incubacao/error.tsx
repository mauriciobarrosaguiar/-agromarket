'use client';

import { useEffect } from 'react';

export default function IncubacaoError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro no módulo de incubação:', error);
  }, [error]);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7f3', color: '#17301f' }}>
      <section style={{ width: 'min(440px, 100%)', padding: 28, border: '1px solid #d8e3da', borderRadius: 18, background: '#fff', textAlign: 'center', boxShadow: '0 16px 40px rgba(18, 65, 38, .08)' }}>
        <div style={{ fontSize: 46 }}>🥚</div>
        <h1 style={{ margin: '10px 0 8px', fontSize: 25 }}>Não foi possível abrir esta etapa</h1>
        <p style={{ margin: '0 0 20px', color: '#68766d', lineHeight: 1.5 }}>Seus dados permanecem salvos. Toque em tentar novamente para continuar.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" onClick={reset} style={{ minHeight: 48, border: 0, borderRadius: 11, color: '#fff', background: '#12613b', fontWeight: 800 }}>Tentar novamente</button>
          <a href="/painel/perfil" style={{ minHeight: 48, display: 'grid', placeItems: 'center', border: '1px solid #d8e3da', borderRadius: 11, color: '#24583a', background: '#fff', fontWeight: 800, textDecoration: 'none' }}>Voltar ao perfil</a>
        </div>
      </section>
    </main>
  );
}
