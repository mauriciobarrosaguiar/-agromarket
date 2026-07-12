const FALLBACK_SITE_URL = 'https://www.meuagromarket.com.br';

function normalizarUrl(url?: string | null) {
  const valor = String(url || '').trim().replace(/\/$/, '');
  if (!valor) return '';
  if (valor.includes('localhost') || valor.includes('127.0.0.1')) return '';
  return valor.startsWith('http') ? valor : `https://${valor}`;
}

export function getPublicSiteUrl() {
  const windowUrl = typeof window !== 'undefined' ? normalizarUrl(window.location.origin) : '';
  const envUrl = normalizarUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const vercelUrl = normalizarUrl(process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL);

  return envUrl || windowUrl || vercelUrl || FALLBACK_SITE_URL;
}

export function getCanonicalSiteUrl() {
  const envUrl = normalizarUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return envUrl || FALLBACK_SITE_URL;
}

export function getAuthRedirectUrl(path = '/login') {
  const caminho = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicSiteUrl()}${caminho}`;
}
