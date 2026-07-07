import AuthGuard from '@/components/AuthGuard';
import AnuncioForm from '@/components/AnuncioForm';

export default function AnunciarPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head">
            <div>
              <h1>Criar anúncio</h1>
              <p>Seu anúncio ficará pendente até aprovação do admin.</p>
            </div>
          </div>
          <div className="card">
            <AnuncioForm />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
