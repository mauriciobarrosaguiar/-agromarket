import AuthGuard from '@/components/AuthGuard';

export default function Page() {
  return (
    <AuthGuard adminOnly>
      <main className="page"><div className="container"><div className="card"><h1>Planos</h1><p className="muted">Área preparada para evolução do AgroMarket.</p></div></div></main>
    </AuthGuard>
  );
}
