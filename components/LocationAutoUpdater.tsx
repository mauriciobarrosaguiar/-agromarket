'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MAX_ACCURACY_METERS = 150;
const LAST_UPDATE_KEY = 'agromarket_last_location_update_at';
const DISMISSED_KEY = 'agromarket_location_update_dismissed';
const MIN_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

type Status = 'idle' | 'capturing' | 'success' | 'low_accuracy' | 'blocked' | 'unsupported' | 'error';

function deveAtualizarAgora() {
  if (typeof window === 'undefined') return false;

  const dispensado = localStorage.getItem(DISMISSED_KEY) === 'true';
  if (dispensado) return false;

  const ultimo = Number(localStorage.getItem(LAST_UPDATE_KEY) || 0);
  if (!ultimo) return true;

  return Date.now() - ultimo > MIN_UPDATE_INTERVAL_MS;
}

function mensagemStatus(status: Status, accuracy?: number | null) {
  if (status === 'capturing') return 'Atualizando sua localização...';
  if (status === 'success') return `Localização atualizada${accuracy ? ` com precisão de ${accuracy}m` : ''}.`;
  if (status === 'low_accuracy') return `Localização capturada, mas com precisão baixa${accuracy ? ` (${accuracy}m)` : ''}. Ative o GPS para validar melhor.`;
  if (status === 'blocked') return 'Localização bloqueada. Ative a permissão do site/app para facilitar anúncios e lojinhas.';
  if (status === 'unsupported') return 'Seu navegador não permite atualizar localização automaticamente.';
  if (status === 'error') return 'Não consegui atualizar a localização agora.';
  return '';
}

export default function LocationAutoUpdater() {
  const [status, setStatus] = useState<Status>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    async function atualizarLocalizacaoAutomatica() {
      if (attemptedRef.current || !deveAtualizarAgora()) return;
      attemptedRef.current = true;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      if (!navigator.geolocation) {
        setStatus('unsupported');
        setVisible(true);
        return;
      }

      setStatus('capturing');
      setVisible(true);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const precisao = Math.round(pos.coords.accuracy || 999999);
          const validada = precisao <= MAX_ACCURACY_METERS;
          const capturadaEm = new Date().toISOString();

          setAccuracy(precisao);

          const { error } = await supabase
            .from('usuarios')
            .update({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              localizacao_accuracy: precisao,
              localizacao_capturada_em: capturadaEm,
              localizacao_validada: validada,
              updated_at: capturadaEm
            })
            .eq('id', userId);

          if (error) {
            setStatus('error');
            setVisible(true);
            return;
          }

          localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
          setStatus(validada ? 'success' : 'low_accuracy');
          setVisible(true);

          if (validada) {
            window.setTimeout(() => setVisible(false), 5000);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            localStorage.setItem(DISMISSED_KEY, 'true');
            setStatus('blocked');
          } else {
            setStatus('error');
          }
          setVisible(true);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }

    atualizarLocalizacaoAutomatica();
  }, []);

  function fechar() {
    if (status === 'blocked') localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  }

  if (!visible || status === 'idle') return null;

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 82,
        zIndex: 860,
        padding: 12,
        boxShadow: '0 18px 45px rgba(0,0,0,.16)',
        border: status === 'success' ? '2px solid #bbf7d0' : status === 'blocked' || status === 'error' ? '2px solid #fecaca' : undefined
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MapPin size={18} /> Localização AgroMarket
          </strong>
          <p className="muted" style={{ margin: '5px 0 0' }}>{mensagemStatus(status, accuracy)}</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={fechar} style={{ padding: 8 }} aria-label="Fechar aviso de localização">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
