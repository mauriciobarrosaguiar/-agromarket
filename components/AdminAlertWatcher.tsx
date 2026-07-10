'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellRing, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PendingCounts = {
  anuncios: number;
  destaques: number;
  patrocinados: number;
  documentos: number;
  denuncias: number;
};

const STORAGE_KEY = 'agromarket_admin_alerts_enabled';

function totalPendencias(counts: PendingCounts) {
  return counts.anuncios + counts.destaques + counts.patrocinados + counts.documentos + counts.denuncias;
}

function resumoPendencias(counts: PendingCounts) {
  const partes: string[] = [];
  if (counts.anuncios) partes.push(`${counts.anuncios} anúncio(s)`);
  if (counts.destaques) partes.push(`${counts.destaques} destaque(s)`);
  if (counts.patrocinados) partes.push(`${counts.patrocinados} patrocinado(s)`);
  if (counts.documentos) partes.push(`${counts.documentos} documento(s)`);
  if (counts.denuncias) partes.push(`${counts.denuncias} denúncia(s)`);
  return partes.length ? partes.join(', ') : 'Nenhuma pendência';
}

function mensagemNovidades(atual: PendingCounts, anterior: PendingCounts) {
  const partes: string[] = [];
  if (atual.anuncios > anterior.anuncios) partes.push(`${atual.anuncios - anterior.anuncios} novo(s) anúncio(s) para aprovar`);
  if (atual.destaques > anterior.destaques) partes.push(`${atual.destaques - anterior.destaques} nova(s) solicitação(ões) de destaque`);
  if (atual.patrocinados > anterior.patrocinados) partes.push(`${atual.patrocinados - anterior.patrocinados} novo(s) banner(s) patrocinado(s)`);
  if (atual.documentos > anterior.documentos) partes.push(`${atual.documentos - anterior.documentos} novo(s) documento(s) para conferir`);
  if (atual.denuncias > anterior.denuncias) partes.push(`${atual.denuncias - anterior.denuncias} nova(s) denúncia(s)`);
  return partes.join(' • ');
}

function tocarAlerta() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audio.currentTime);
      oscillator.frequency.setValueAtTime(660, audio.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.42);

      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.45);
    }
  } catch {
    // Alguns navegadores bloqueiam áudio sem interação do usuário.
  }

  if ('vibrate' in navigator) {
    navigator.vibrate([250, 120, 250]);
  }
}

function notificarSistema(texto: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification('AgroMarket', {
    body: texto,
    icon: '/icon-192.png',
    tag: 'agromarket-admin-alert'
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = '/painel';
  };
}

export default function AdminAlertWatcher() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [counts, setCounts] = useState<PendingCounts>({ anuncios: 0, destaques: 0, patrocinados: 0, documentos: 0, denuncias: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastCountsRef = useRef<PendingCounts | null>(null);
  const initializedRef = useRef(false);

  const fetchCounts = useCallback(async (silencioso = false) => {
    const [{ count: anuncios }, { count: destaques }, { count: patrocinados }, { count: documentos }, { count: denuncias }] = await Promise.all([
      supabase.from('anuncios').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('destaque_solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('patrocinados_home').select('id', { count: 'exact', head: true }).in('status', ['pendente_pagamento', 'pendente']),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('documento_status', 'pendente'),
      supabase.from('denuncias').select('id', { count: 'exact', head: true }).eq('status', 'aberta')
    ]);

    const atual: PendingCounts = {
      anuncios: anuncios || 0,
      destaques: destaques || 0,
      patrocinados: patrocinados || 0,
      documentos: documentos || 0,
      denuncias: denuncias || 0
    };

    const anterior = lastCountsRef.current;
    const novidade = anterior ? mensagemNovidades(atual, anterior) : '';

    setCounts(atual);
    lastCountsRef.current = atual;

    if (!silencioso && enabled && initializedRef.current && anterior && novidade) {
      tocarAlerta();
      setToast(novidade);
      notificarSistema(novidade);
      setTimeout(() => setToast(null), 9000);
    }

    initializedRef.current = true;
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('tipo_usuario')
        .eq('id', userData.user.id)
        .maybeSingle();

      const admin = perfil?.tipo_usuario === 'admin';
      setIsAdmin(admin);

      if (admin) {
        const ativo = localStorage.getItem(STORAGE_KEY) === 'true';
        setEnabled(ativo);
        await fetchCounts(true);
      } else {
        setLoading(false);
      }
    }

    init();
  }, [fetchCounts]);

  useEffect(() => {
    if (!isAdmin) return;

    const interval = window.setInterval(() => fetchCounts(false), 30000);
    const onVisibility = () => {
      if (!document.hidden) fetchCounts(false);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchCounts, isAdmin]);

  async function ativarAlertas() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    setEnabled(true);
    initializedRef.current = true;
    tocarAlerta();
    await fetchCounts(true);
    setToast('Alertas ativados. Vou avisar quando chegar nova solicitação.');
    setTimeout(() => setToast(null), 7000);
  }

  if (!isAdmin || loading) return null;

  const total = totalPendencias(counts);
  const mostrarControles = pathname.startsWith('/admin') || pathname.startsWith('/painel');

  if (!mostrarControles) return null;

  return (
    <>
      {!enabled && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={ativarAlertas}
          style={{ position: 'fixed', right: 12, top: 82, zIndex: 850, boxShadow: '0 12px 30px rgba(22,101,52,.18)', padding: '9px 12px' }}
        >
          <BellRing size={16} /> Ativar alertas
        </button>
      )}

      {enabled && total > 0 && (
        <div
          className="card"
          style={{ position: 'fixed', right: 12, top: 82, zIndex: 840, padding: 12, maxWidth: 320, boxShadow: '0 18px 45px rgba(0,0,0,.16)' }}
        >
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BellRing size={18} /> {total} pendência(s)</strong>
          <p className="muted" style={{ margin: '4px 0 10px' }}>{resumoPendencias(counts)}</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {counts.anuncios > 0 && <Link className="btn btn-primary btn-full" href="/admin/pendentes">Aprovar anúncios ({counts.anuncios})</Link>}
            {counts.destaques > 0 && <Link className="btn btn-primary btn-full" href="/admin/destaques">Aprovar destaques ({counts.destaques})</Link>}
            {counts.patrocinados > 0 && <Link className="btn btn-primary btn-full" href="/admin/patrocinados">Ver patrocinados ({counts.patrocinados})</Link>}
            {counts.documentos > 0 && <Link className="btn btn-primary btn-full" href="/admin/usuarios">Ver documentos ({counts.documentos})</Link>}
            {counts.denuncias > 0 && <Link className="btn btn-primary btn-full" href="/admin/denuncias">Ver denúncias ({counts.denuncias})</Link>}
          </div>
        </div>
      )}

      {toast && (
        <div
          className="card"
          style={{ position: 'fixed', left: 12, right: 12, top: 82, zIndex: 900, padding: 14, border: '2px solid #16a34a', boxShadow: '0 20px 55px rgba(0,0,0,.2)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
            <div>
              <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BellRing size={18} /> Novo alerta AgroMarket</strong>
              <p className="muted" style={{ margin: '6px 0 0' }}>{toast}</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setToast(null)} style={{ padding: 8 }}><X size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
