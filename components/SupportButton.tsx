'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

type SuporteConfig = {
  whatsapp?: string;
  mensagem?: string;
};

export default function SupportButton() {
  const [config, setConfig] = useState<SuporteConfig>({
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE,
    mensagem: 'Olá, preciso de suporte no AgroMarket.'
  });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('site_configuracoes').select('valor').eq('chave', 'suporte').maybeSingle();
      const valor = data?.valor as SuporteConfig | undefined;
      if (valor?.whatsapp) setConfig((prev) => ({ ...prev, ...valor }));
    }

    load();
  }, []);

  const phone = onlyNumbers(config.whatsapp);
  if (!phone) return null;

  const texto = encodeURIComponent(config.mensagem || 'Olá, preciso de suporte no AgroMarket.');

  return (
    <a
      className="btn btn-whatsapp"
      href={`https://wa.me/${phone}?text=${texto}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com suporte do AgroMarket"
      style={{
        marginTop: 14,
        borderRadius: 14,
        padding: '11px 14px',
        width: 'fit-content',
        maxWidth: '100%'
      }}
    >
      <MessageCircle size={18} /> Suporte AgroMarket
    </a>
  );
}
