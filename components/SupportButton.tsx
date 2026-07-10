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
  const [isMobile, setIsMobile] = useState(false);
  const [config, setConfig] = useState<SuporteConfig>({
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE,
    mensagem: 'Olá, preciso de suporte no AgroMarket.'
  });

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 860);
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
        position: 'fixed',
        left: isMobile ? 12 : 'auto',
        right: isMobile ? 'auto' : 18,
        bottom: isMobile ? 82 : 18,
        zIndex: 820,
        borderRadius: 999,
        boxShadow: '0 16px 38px rgba(22,101,52,.24)',
        padding: isMobile ? '11px 13px' : '12px 16px'
      }}
    >
      <MessageCircle size={18} /> {isMobile ? 'Suporte' : 'Suporte AgroMarket'}
    </a>
  );
}
