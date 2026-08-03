'use client';

import { ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type OfflineRecord = Record<string, unknown> & {
  id?: string;
  _offline_pending?: boolean;
};

type IncubacaoCache = {
  incubacoes: OfflineRecord[];
  chocadeiras: OfflineRecord[];
  medicoes: OfflineRecord[];
  ovoscopias: OfflineRecord[];
  nascimentos: OfflineRecord[];
  updatedAt?: string;
};

type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  headers: [string, string][];
  body: string | null;
  createdAt: string;
};

const CACHE_KEY = 'agro-incubacao-offline-cache-v1';
const QUEUE_KEY = 'agro-incubacao-offline-queue-v1';
const USER_KEY = 'agro-incubacao-offline-user-v1';

const EMPTY_CACHE: IncubacaoCache = {
  incubacoes: [],
  chocadeiras: [],
  medicoes: [],
  ovoscopias: [],
  nascimentos: []
};

const TABLE_TO_CACHE: Record<string, keyof IncubacaoCache> = {
  agro_incubacoes: 'incubacoes',
  agro_chocadeiras: 'chocadeiras',
  agro_incubacao_medicoes: 'medicoes',
  agro_incubacao_ovoscopias: 'ovoscopias',
  agro_incubacao_nascimentos: 'nascimentos'
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readCache(): IncubacaoCache {
  if (typeof window === 'undefined') return { ...EMPTY_CACHE };
  return {
    ...EMPTY_CACHE,
    ...safeParse<Partial<IncubacaoCache>>(localStorage.getItem(CACHE_KEY), {})
  };
}

function writeCache(cache: IncubacaoCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, updatedAt: new Date().toISOString() }));
  } catch {
    // Se o armazenamento estiver cheio, o app continua online normalmente.
  }
}

function readQueue(): QueuedRequest[] {
  if (typeof window === 'undefined') return [];
  return safeParse<QueuedRequest[]>(localStorage.getItem(QUEUE_KEY), []);
}

function writeQueue(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // A falha será exibida pela própria operação do aplicativo.
  }
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function jsonResponse(data: unknown, status = 200, sourceHeaders?: Headers) {
  const headers = new Headers(sourceHeaders || undefined);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers });
}

function noContent(status = 204) {
  return new Response(null, { status });
}

function tableFromUrl(url: URL) {
  const marker = '/rest/v1/';
  const index = url.pathname.indexOf(marker);
  if (index < 0) return null;
  const remaining = url.pathname.slice(index + marker.length);
  const table = remaining.split('/')[0];
  return table || null;
}

function rpcFromUrl(url: URL) {
  const marker = '/rest/v1/rpc/';
  const index = url.pathname.indexOf(marker);
  if (index < 0) return null;
  return url.pathname.slice(index + marker.length).split('/')[0] || null;
}

function queryEq(url: URL, field: string) {
  const value = url.searchParams.get(field);
  if (!value) return null;
  return value.startsWith('eq.') ? value.slice(3) : value;
}

function findStoredUser() {
  const direct = safeParse<Record<string, unknown> | null>(localStorage.getItem(USER_KEY), null);
  if (direct) return direct;

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
    const session = safeParse<Record<string, unknown> | null>(localStorage.getItem(key), null);
    const user = session?.user || (session?.currentSession as Record<string, unknown> | undefined)?.user;
    if (user && typeof user === 'object') return user as Record<string, unknown>;
  }

  return null;
}

function mergePending(serverRows: OfflineRecord[], localRows: OfflineRecord[]) {
  const pending = localRows.filter((item) => item._offline_pending);
  const pendingIds = new Set(pending.map((item) => item.id).filter(Boolean));
  return [...pending, ...serverRows.filter((item) => !item.id || !pendingIds.has(item.id))];
}

function relationIncubadora(record: OfflineRecord, cache: IncubacaoCache) {
  const chocadeiraId = String(record.chocadeira_id || '');
  const chocadeira = cache.chocadeiras.find((item) => item.id === chocadeiraId);
  if (!chocadeira) return { ...record, agro_chocadeiras: record.agro_chocadeiras || null };
  return {
    ...record,
    agro_chocadeiras: {
      nome: chocadeira.nome,
      capacidade: chocadeira.capacidade
    }
  };
}

function offlineRows(table: string, url: URL, cache: IncubacaoCache) {
  const key = TABLE_TO_CACHE[table];
  if (!key) return [];
  const source = Array.isArray(cache[key]) ? [...(cache[key] as OfflineRecord[])] : [];

  if (table === 'agro_chocadeiras') {
    const active = queryEq(url, 'ativo');
    return source
      .filter((item) => active !== 'true' || item.ativo !== false)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }

  if (table === 'agro_incubacoes') {
    return source
      .map((item) => relationIncubadora(item, cache))
      .sort((a, b) => String(b.data_inicio || '').localeCompare(String(a.data_inicio || '')));
  }

  const dateField = table === 'agro_incubacao_medicoes'
    ? 'registrado_em'
    : table === 'agro_incubacao_ovoscopias'
      ? 'realizado_em'
      : 'registrado_em';

  return source.sort((a, b) => String(b[dateField] || '').localeCompare(String(a[dateField] || '')));
}

function addQueuedRequest(request: Request, body: string | null) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body,
    createdAt: new Date().toISOString()
  });
  writeQueue(queue);
  return queue.length;
}

function insertLocal(table: string, input: OfflineRecord, cache: IncubacaoCache) {
  const key = TABLE_TO_CACHE[table];
  if (!key) return input;

  const now = new Date().toISOString();
  const record: OfflineRecord = {
    ...input,
    id: String(input.id || uuid()),
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    _offline_pending: true
  };

  if (table === 'agro_chocadeiras') {
    Object.assign(record, {
      ativo: record.ativo ?? true,
      temperatura_padrao: record.temperatura_padrao ?? 37.7,
      umidade_padrao: record.umidade_padrao ?? 52
    });
  }

  if (table === 'agro_incubacoes') {
    const quantity = Number(record.quantidade_inicial || 0);
    Object.assign(record, {
      ovos_ativos: record.ovos_ativos ?? quantity,
      ovos_ferteis: record.ovos_ferteis ?? 0,
      ovos_nao_ferteis: record.ovos_nao_ferteis ?? 0,
      ovos_retirados: record.ovos_retirados ?? 0,
      nascidos_vivos: record.nascidos_vivos ?? 0,
      status: record.status || 'em_incubacao'
    });
  }

  if (table === 'agro_incubacao_medicoes') record.registrado_em = record.registrado_em || now;

  const rows = cache[key] as OfflineRecord[];
  cache[key] = [record, ...rows.filter((item) => item.id !== record.id)] as never;
  writeCache(cache);
  return table === 'agro_incubacoes' ? relationIncubadora(record, cache) : record;
}

function updateLocal(table: string, url: URL, patch: OfflineRecord, cache: IncubacaoCache) {
  const key = TABLE_TO_CACHE[table];
  if (!key) return;
  const id = queryEq(url, 'id');
  if (!id) return;
  cache[key] = (cache[key] as OfflineRecord[]).map((item) => item.id === id
    ? { ...item, ...patch, updated_at: new Date().toISOString(), _offline_pending: true }
    : item) as never;
  writeCache(cache);
}

function applyOfflineOvoscopy(payload: Record<string, unknown>, cache: IncubacaoCache) {
  const incubationId = String(payload.p_incubacao_id || '');
  const now = new Date().toISOString();
  const removed = Number(payload.p_ovos_nao_ferteis || 0)
    + Number(payload.p_embrioes_mortos || 0)
    + Number(payload.p_ovos_trincados || 0)
    + Number(payload.p_ovos_contaminados || 0);
  const id = uuid();

  cache.ovoscopias.unshift({
    id,
    incubacao_id: incubationId,
    realizado_em: now,
    ovos_analisados: Number(payload.p_ovos_analisados || 0),
    ovos_ferteis: Number(payload.p_ovos_ferteis || 0),
    ovos_nao_ferteis: Number(payload.p_ovos_nao_ferteis || 0),
    embrioes_mortos: Number(payload.p_embrioes_mortos || 0),
    ovos_trincados: Number(payload.p_ovos_trincados || 0),
    ovos_contaminados: Number(payload.p_ovos_contaminados || 0),
    observacoes: payload.p_observacoes || null,
    _offline_pending: true
  });

  cache.incubacoes = cache.incubacoes.map((item) => item.id === incubationId ? {
    ...item,
    ovos_ativos: Math.max(Number(item.ovos_ativos || 0) - removed, 0),
    ovos_ferteis: Math.max(Number(item.ovos_ativos || 0) - removed, 0),
    ovos_nao_ferteis: Number(item.ovos_nao_ferteis || 0) + Number(payload.p_ovos_nao_ferteis || 0),
    ovos_retirados: Number(item.ovos_retirados || 0) + removed,
    _offline_pending: true
  } : item);

  writeCache(cache);
  return id;
}

function applyOfflineBirth(payload: Record<string, unknown>, cache: IncubacaoCache) {
  const incubationId = String(payload.p_incubacao_id || '');
  const now = new Date().toISOString();
  const live = Number(payload.p_nascidos_vivos || 0) + Number(payload.p_nascidos_fracos || 0);
  const losses = Number(payload.p_mortos_apos_nascer || 0)
    + Number(payload.p_mortos_no_ovo || 0)
    + Number(payload.p_bicaram_nao_nasceram || 0);
  const id = uuid();

  cache.nascimentos.unshift({
    id,
    incubacao_id: incubationId,
    registrado_em: now,
    nascidos_vivos: Number(payload.p_nascidos_vivos || 0),
    nascidos_fracos: Number(payload.p_nascidos_fracos || 0),
    mortos_apos_nascer: Number(payload.p_mortos_apos_nascer || 0),
    mortos_no_ovo: Number(payload.p_mortos_no_ovo || 0),
    bicaram_nao_nasceram: Number(payload.p_bicaram_nao_nasceram || 0),
    nascimentos_auxiliados: Number(payload.p_nascimentos_auxiliados || 0),
    observacoes: payload.p_observacoes || null,
    _offline_pending: true
  });

  cache.incubacoes = cache.incubacoes.map((item) => item.id === incubationId ? {
    ...item,
    ovos_ativos: Math.max(Number(item.ovos_ativos || 0) - live - losses, 0),
    nascidos_vivos: Number(item.nascidos_vivos || 0) + live,
    ovos_retirados: Number(item.ovos_retirados || 0)
      + Number(payload.p_mortos_no_ovo || 0)
      + Number(payload.p_bicaram_nao_nasceram || 0),
    status: 'em_eclosao',
    _offline_pending: true
  } : item);

  writeCache(cache);
  return id;
}

function clearPendingMarks(cache: IncubacaoCache) {
  const clean = (rows: OfflineRecord[]) => rows.map(({ _offline_pending: _ignored, ...record }) => record);
  return {
    ...cache,
    incubacoes: clean(cache.incubacoes),
    chocadeiras: clean(cache.chocadeiras),
    medicoes: clean(cache.medicoes),
    ovoscopias: clean(cache.ovoscopias),
    nascimentos: clean(cache.nascimentos)
  };
}

export default function IncubacaoOfflineBridge({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useLayoutEffect(() => {
    setOnline(navigator.onLine);
    setPending(readQueue().length);

    const restClient = (supabase as unknown as { rest?: { fetch?: FetchLike } }).rest;
    const authClient = supabase.auth as unknown as { fetch?: FetchLike };
    const originalRestFetch = restClient?.fetch?.bind(restClient);
    const originalAuthFetch = authClient.fetch?.bind(authClient);

    if (!originalRestFetch || !originalAuthFetch || !restClient) return;

    const updatePending = () => setPending(readQueue().length);

    const restFetch: FetchLike = async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const rpc = rpcFromUrl(url);
      const table = rpc ? null : tableFromUrl(url);
      const supported = Boolean(rpc || (table && TABLE_TO_CACHE[table]));
      if (!supported) return originalRestFetch(input, init);

      if (request.method === 'GET') {
        if (navigator.onLine) {
          try {
            const response = await originalRestFetch(input, init);
            if (!response.ok || !table) return response;
            const data = await response.clone().json().catch(() => null);
            if (!Array.isArray(data)) return response;

            const cache = readCache();
            const key = TABLE_TO_CACHE[table];
            const merged = mergePending(data as OfflineRecord[], cache[key] as OfflineRecord[]);
            cache[key] = merged as never;
            writeCache(cache);
            return jsonResponse(merged, response.status, response.headers);
          } catch {
            setOnline(false);
          }
        }

        if (table) return jsonResponse(offlineRows(table, url, readCache()));
      }

      if (navigator.onLine) {
        try {
          return await originalRestFetch(input, init);
        } catch {
          setOnline(false);
        }
      }

      const bodyText = request.method === 'GET' || request.method === 'HEAD'
        ? null
        : await request.clone().text();
      const payload = safeParse<OfflineRecord>(bodyText, {});
      const cache = readCache();

      if (rpc === 'agro_incubacao_registrar_ovoscopia') {
        const id = applyOfflineOvoscopy(payload, cache);
        addQueuedRequest(request, bodyText);
        updatePending();
        return jsonResponse(id, 200);
      }

      if (rpc === 'agro_incubacao_registrar_nascimento') {
        const id = applyOfflineBirth(payload, cache);
        addQueuedRequest(request, bodyText);
        updatePending();
        return jsonResponse(id, 200);
      }

      if (table && request.method === 'POST') {
        const record = insertLocal(table, payload, cache);
        const queuedBody = JSON.stringify({ ...payload, id: record.id });
        addQueuedRequest(request, queuedBody);
        updatePending();
        const accept = request.headers.get('Accept') || '';
        const wantsObject = accept.includes('vnd.pgrst.object');
        const wantsRepresentation = url.searchParams.has('select') || (request.headers.get('Prefer') || '').includes('return=representation');
        if (!wantsRepresentation) return noContent(201);
        return jsonResponse(wantsObject ? record : [record], 201);
      }

      if (table && (request.method === 'PATCH' || request.method === 'PUT')) {
        updateLocal(table, url, payload, cache);
        addQueuedRequest(request, bodyText);
        updatePending();
        return noContent(204);
      }

      return jsonResponse({ message: 'Operação guardada para sincronização.' }, 202);
    };

    const authFetch: FetchLike = async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (!url.pathname.includes('/auth/v1/user')) return originalAuthFetch(input, init);

      if (navigator.onLine) {
        try {
          const response = await originalAuthFetch(input, init);
          if (response.ok) {
            const user = await response.clone().json().catch(() => null);
            if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
          }
          return response;
        } catch {
          setOnline(false);
        }
      }

      const user = findStoredUser();
      return user
        ? jsonResponse(user, 200)
        : jsonResponse({ message: 'Abra o módulo uma vez com internet antes de usar offline.' }, 503);
    };

    restClient.fetch = restFetch;
    authClient.fetch = authFetch;

    return () => {
      restClient.fetch = originalRestFetch;
      authClient.fetch = originalAuthFetch;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function synchronize() {
      if (!navigator.onLine || syncing) return;
      const queue = readQueue();
      if (!queue.length) return;

      const restClient = (supabase as unknown as { rest?: { fetch?: FetchLike } }).rest;
      const activeFetch = restClient?.fetch;
      if (!activeFetch) return;

      setSyncing(true);
      const remaining: QueuedRequest[] = [];

      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        try {
          const response = await activeFetch(item.url, {
            method: item.method,
            headers: Object.fromEntries(item.headers),
            body: item.body
          });
          if (!response.ok && response.status !== 409) {
            remaining.push(...queue.slice(index));
            break;
          }
        } catch {
          remaining.push(...queue.slice(index));
          break;
        }
      }

      if (cancelled) return;
      writeQueue(remaining);
      setPending(remaining.length);
      setSyncing(false);

      if (!remaining.length) {
        writeCache(clearPendingMarks(readCache()));
        window.setTimeout(() => window.location.reload(), 500);
      }
    }

    const onOnline = () => {
      setOnline(true);
      window.setTimeout(synchronize, 1000);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (navigator.onLine && readQueue().length) window.setTimeout(synchronize, 800);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncing]);

  const visible = !online || pending > 0 || syncing;

  return (
    <>
      {visible && (
        <div style={{
          position: 'fixed',
          right: 12,
          bottom: 84,
          zIndex: 8000,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          maxWidth: 'calc(100vw - 24px)',
          padding: '10px 13px',
          border: '1px solid rgba(255,255,255,.18)',
          borderRadius: 12,
          color: '#fff',
          background: online ? '#1b6942' : '#8a5a14',
          boxShadow: '0 12px 30px rgba(0,0,0,.22)',
          fontSize: 12,
          fontWeight: 800
        }}>
          {syncing ? <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} /> : online ? <Cloud size={17} /> : <CloudOff size={17} />}
          <span>
            {syncing
              ? 'Sincronizando dados...'
              : !online
                ? `Sem internet${pending ? ` • ${pending} registro(s) guardado(s)` : ' • modo offline'}`
                : `${pending} registro(s) aguardando sincronização`}
          </span>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}
      {children}
    </>
  );
}
