'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  ChevronDown,
  ShieldCheck,
  Sprout,
  Store
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Usuario, Vitrine } from '@/types';
import styles from './painelOrganizado.module.css';

type SecaoId = 'admin' | 'vitrine' | 'gestao' | 'resultados';

function MenuRecolhivel({
  id,
  titulo,
  descricao,
  icon: Icon,
  aberto,
  aoAlternar,
  destaque,
  badge,
  children
}: {
  id: SecaoId;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  aberto: boolean;
  aoAlternar: (id: SecaoId) => void;
  destaque?: 'admin' | 'gestao';
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`${styles.menuCard} ${
        destaque === 'admin'
          ? styles.menuCardAdmin
          : destaque === 'gestao'
            ? styles.menuCardGestao
            : ''
      }`}
    >
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => aoAlternar(id)}
        aria-expanded={aberto}
        aria-controls={`conteudo-${id}`}
      >
        <span className={`${styles.iconBox} ${destaque === 'gestao' ? styles.iconBoxAmber : ''}`}>
          <Icon size={24} />
        </span>
        <span className={styles.menuText}>
          <strong>{titulo}</strong>
          <span>{descricao}</span>
        </span>
        {badge}
        <ChevronDown
          size={22}
          className={`${styles.chevron} ${aberto ? styles.chevronOpen : ''}`}
        />
      </button>

      {aberto && (
        <div id={`conteudo-${id}`} className={styles.menuBody}>
          {children}
        </div>
      )}
    </section>
  );
}

function PainelContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [pendentesAdmin, setPendentesAdmin] = useState(0);
  const [destaquesPendentes, setDestaquesPendentes] = useState(0);
  const [denunciasAbertas, setDenunciasAbertas] = useState(0);
  const [secaoAberta, setSecaoAberta] = useState<SecaoId | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ data: meusAnuncios }, { data: meuPerfil }, { data: minhaVitrine }] = await Promise.all([
        supabase.from('anuncios').select('*').eq('usuario_id', userData.user.id),
        supabase.from('usuarios').select('*').eq('id', userData.user.id).single(),
        supabase.from('vitrines').select('*').eq('usuario_id', userData.user.id).maybeSingle()
      ]);

      setAnuncios((meusAnuncios || []) as Anuncio[]);
      setPerfil(meuPerfil as Usuario);
      setVitrine((minhaVitrine || null) as Vitrine | null);

      if (meuPerfil?.tipo_usuario === 'admin') {
        const [{ count: adsCount }, { count: destaquesCount }, { count: denunciasCount }] = await Promise.all([
          supabase.from('anuncios').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
          supabase.from('destaque_solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
          supabase.from('denuncias').select('id', { count: 'exact', head: true }).eq('status', 'aberta')
        ]);
        setPendentesAdmin(adsCount || 0);
        setDestaquesPendentes(destaquesCount || 0);
        setDenunciasAbertas(denunciasCount || 0);
      }
    }
    load();
  }, []);

  const totalViews = anuncios.reduce((acc, ad) => acc + (ad.visualizacoes || 0), 0);
  const totalClicks = anuncios.reduce((acc, ad) => acc + (ad.cliques_whatsapp || 0), 0);
  const aprovados = anuncios.filter((a) => a.status === 'aprovado').length;
  const pendentes = anuncios.filter((a) => a.status === 'pendente').length;
  const isAdmin = perfil?.tipo_usuario === 'admin';
  const totalAdminPendencias = pendentesAdmin + destaquesPendentes + denunciasAbertas;

  function alternarSecao(id: SecaoId) {
    setSecaoAberta((atual) => (atual === id ? null : id));
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>{isAdmin ? 'Painel admin e anunciante' : 'Painel do anunciante'}</h1>
            <p>Escolha uma área abaixo para visualizar e administrar.</p>
          </div>
          <Link href="/anunciar" className="btn btn-primary">Novo anúncio</Link>
        </div>

        <div className={styles.panelStack}>
          {isAdmin && (
            <MenuRecolhivel
              id="admin"
              titulo="Área do administrador"
              descricao="Aprovações, planos, segurança e configurações administrativas."
              icon={ShieldCheck}
              aberto={secaoAberta === 'admin'}
              aoAlternar={alternarSecao}
              destaque="admin"
              badge={totalAdminPendencias > 0 ? <span className={styles.countBadge}>{totalAdminPendencias}</span> : undefined}
            >
              <p className={styles.bodyIntro}>
                Acesse somente as ferramentas administrativas que precisar.
              </p>
              <div className={styles.actionGrid}>
                <Link className={pendentesAdmin ? 'btn btn-primary' : 'btn btn-secondary'} href="/admin/pendentes">Aprovar anúncios ({pendentesAdmin})</Link>
                <Link className={destaquesPendentes ? 'btn btn-primary' : 'btn btn-secondary'} href="/admin/destaques">Aprovar destaques ({destaquesPendentes})</Link>
                <Link className={denunciasAbertas ? 'btn btn-primary' : 'btn btn-secondary'} href="/admin/denuncias">Ver denúncias ({denunciasAbertas})</Link>
                <Link className="btn btn-secondary" href="/admin/monetizacao">Planos e pagamentos</Link>
                <Link className="btn btn-secondary" href="/admin/seguranca">Backup e segurança</Link>
                <Link className="btn btn-secondary" href="/admin/vitrines">Gerenciar vitrines</Link>
                <Link className="btn btn-primary" href="/admin">Central admin completa</Link>
              </div>
            </MenuRecolhivel>
          )}

          <MenuRecolhivel
            id="vitrine"
            titulo="Minha vitrine"
            descricao="Configure sua lojinha e visualize a página pública."
            icon={Store}
            aberto={secaoAberta === 'vitrine'}
            aoAlternar={alternarSecao}
          >
            <p className={styles.bodyIntro}>
              Mostre seus produtos em uma página pública. No lançamento, a vitrine está liberada grátis.
            </p>
            <div className={styles.actionGrid}>
              <Link className="btn btn-primary" href="/painel/vitrine">Configurar vitrine</Link>
              {vitrine?.slug && <Link className="btn btn-secondary" href={`/vendedor/${vitrine.slug}`}>Ver vitrine pública</Link>}
            </div>
          </MenuRecolhivel>

          <MenuRecolhivel
            id="gestao"
            titulo="AgroGestão"
            descricao="Produtos, produção, estoque, vendas, clientes e valores a receber."
            icon={Sprout}
            aberto={secaoAberta === 'gestao'}
            aoAlternar={alternarSecao}
            destaque="gestao"
            badge={<span className={styles.newBadge}>Novo</span>}
          >
            <p className={styles.bodyIntro}>
              Controle sua atividade sem alterar os anúncios publicados no AgroMarket.
            </p>
            <div className={styles.actionGrid}>
              <Link className="btn btn-amber" href="/painel/gestao">Abrir estoque e vendas</Link>
            </div>
          </MenuRecolhivel>

          <MenuRecolhivel
            id="resultados"
            titulo="Resultados dos anúncios"
            descricao="Veja anúncios, aprovações, visualizações e cliques no WhatsApp."
            icon={BarChart3}
            aberto={secaoAberta === 'resultados'}
            aoAlternar={alternarSecao}
          >
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}><strong>{anuncios.length}</strong><span>Total de anúncios</span></div>
              <div className={styles.metricCard}><strong>{aprovados}</strong><span>Aprovados</span></div>
              <div className={styles.metricCard}><strong>{pendentes}</strong><span>Pendentes</span></div>
              <div className={styles.metricCard}><strong>{totalViews}</strong><span>Visualizações</span></div>
              <div className={styles.metricCard}><strong>{totalClicks}</strong><span>Cliques WhatsApp</span></div>
            </div>
            <div className={styles.actionGrid}>
              <Link className="btn btn-secondary" href="/painel/anuncios">Gerenciar meus anúncios</Link>
              <Link className="btn btn-secondary" href="/painel/perfil">Meu perfil</Link>
            </div>
            <div className={styles.quickHint}>Toque novamente no título para fechar esta área.</div>
          </MenuRecolhivel>
        </div>
      </div>
    </main>
  );
}

export default function PainelPage() {
  return <AuthGuard><PainelContent /></AuthGuard>;
}
