const ASAAS_BASE_URL = process.env.ASAAS_ENVIRONMENT === 'production' || process.env.ASAAS_ENVIRONMENT === 'producao'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

export function asaasConfigurado() {
  return Boolean(process.env.ASAAS_ACCESS_TOKEN);
}

export async function asaasRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.ASAAS_ACCESS_TOKEN;
  if (!token) throw new Error('ASAAS_ACCESS_TOKEN não configurado na Vercel.');

  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: token,
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errors = data?.errors?.map((item: { description?: string }) => item.description).filter(Boolean).join(' | ');
    throw new Error(errors || data?.message || `Erro Asaas ${response.status}`);
  }

  return data as T;
}

export type AsaasCustomer = {
  id: string;
};

export type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  dueDate?: string;
};

export type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};
