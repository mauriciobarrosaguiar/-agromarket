'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const MAX_ACCURACY_METERS = 150;
const LAST_UPDATE_KEY = 'agromarket_last_location_update_at';
const DISMISSED_KEY = 'agromarket_location_update_dismissed';
const MIN_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

function deveAtualizarAgora() {
  if (typeof window === 'undefined') return false;

  const dispensado = localStorage.getItem(DISMISSED_KEY) === 'true';
  if (dispensado) return false;

  const ultimo = Number(localStorage.getItem(LAST_UPDATE_KEY) || 0);
  if (!ultimo) return true;

  return Date.now() - ultimo > MIN_UPDATE_INTERVAL_MS;
}

export default function LocationAutoUpdater() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    async function atualizarLocalizacaoAutomatica() {
      if (attemptedRef.current || !deveAtualizarAgora()) return;
      attemptedRef.current = true;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || !navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const precisao = Math.round(pos.coords.accuracy || 999999);
          const capturadaEm = new Date().toISOString();

          await supabase
            .from('usuarios')
            .update({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              localizacao_accuracy: precisao,
              localizacao_capturada_em: capturadaEm,
              localizacao_validada: precisao <= MAX_ACCURACY_METERS,
              updated_at: capturadaEm
            })
            .eq('id', userId);

          localStorage.setItem(LAST_UPDATE_KEY, String(Date.now()));
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            localStorage.setItem(DISMISSED_KEY, 'true');
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }

    atualizarLocalizacaoAutomatica();
  }, []);

  return null;
}
