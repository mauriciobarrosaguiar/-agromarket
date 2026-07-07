'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  async function load() {
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    setUsuarios((data || []) as Usuario[]);
  }

  useEffect(() => { load(); }, []);

  async function mudarTipo(id: string, tipo: string) {
    await supabase.from('usuarios').update({ tipo_usuario: tipo }).eq('id', id);
    await load();
  }

  async function bloquear(id: string, status: string) {
    await supabase.from('usuarios').update({ status }).eq('id', id);
    await load();
  }

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Usuário</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.nome}</strong><br /><span className="muted">{u.email}<br />{u.whatsapp}</span></td>
              <td>{u.tipo_usuario}</td>
              <td>{u.status}</td>
              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => mudarTipo(u.id, 'admin')}>Tornar admin</button>
                <button className="btn btn-secondary" onClick={() => mudarTipo(u.id, 'anunciante')}>Anunciante</button>
                <button className="btn btn-danger" onClick={() => bloquear(u.id, u.status === 'bloqueado' ? 'ativo' : 'bloqueado')}>{u.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsuariosPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Usuários</h1><UsuariosContent /></div></main></AuthGuard>;
}
