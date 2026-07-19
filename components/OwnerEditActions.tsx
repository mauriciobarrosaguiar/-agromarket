'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type EditState = {
  href: string;
  label: string;
} | null;

export default function OwnerEditActions() {
  const pathname = usePathname();
  const [action, setAction] = useState<EditState>(null);

  useEffect(() => {
    async function load() {
      setAction(null);
      const anuncioMatch = pathname.match(/^\/anuncio\/([^/]+)/);
      const vitrineMatch = pathname.match(/^\/vendedor\/([^/]+)/);
      if (!anuncioMatch && !vitrineMatch) return;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data: perfil } = await supabase.from('usuarios').select('tipo_usuario').eq('id', userId).maybeSingle();
      const isAdmin = perfil?.tipo_usuario === 'admin';

      if (anuncioMatch) {
        const slug = anuncioMatch[1];
        const { data: anuncio } = await supabase.from('anuncios').select('id, usuario_id').eq('slug', slug).maybeSingle();
        if (anuncio && (anuncio.usuario_id === userId || isAdmin)) {
          setAction({ href: `/painel/editar/${anuncio.id}`, label: 'Editar anúncio' });
        }
        return;
      }

      if (vitrineMatch) {
        const slug = vitrineMatch[1];
        const { data: vitrine } = await supabase.from('vitrines').select('slug, usuario_id').eq('slug', slug).maybeSingle();
        if (!vitrine) return;
        if (isAdmin) setAction({ href: `/admin/vitrines/${vitrine.slug}/editar`, label: 'Editar lojinha' });
        else if (vitrine.usuario_id === userId) setAction({ href: '/painel/vitrine', label: 'Editar lojinha' });
      }
    }

    load();
  }, [pathname]);

  if (!action) return null;

  return (
    <Link
      className="btn btn-primary"
      href={action.href}
      style={{
        position: 'fixed',
        right: 12,
        bottom: 92,
        zIndex: 875,
        borderRadius: 999,
        boxShadow: '0 18px 45px rgba(0,0,0,.18)'
      }}
    >
      <Pencil size={18} /> {action.label}
    </Link>
  );
}
