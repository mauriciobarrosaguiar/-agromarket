import { createClient } from '@supabase/supabase-js';

export const SITE_NAME = 'AgroMarket';
export const DEFAULT_SITE_URL = 'https://agromarket-two.vercel.app';
export const DEFAULT_IMAGE = '/icon-192.png';

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  return DEFAULT_SITE_URL;
}

export function getAbsoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return getSiteUrl();
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${getSiteUrl()}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function cleanText(value?: string | null, limit = 160) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3).trim()}...`;
}

export function formatMoneySeo(value?: number | string | null, combinar = false) {
  if (combinar || value === null || value === undefined || value === '') return 'A combinar';
  const numero = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numero)) return 'A combinar';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero);
}

export function createSeoSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
