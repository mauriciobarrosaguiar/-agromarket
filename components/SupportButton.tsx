'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

export default function SupportButton() {
  const [isMobile, setIsMobile] = useState(false);
  const phone = onlyNumbers(process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 860);
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!phone) return null;

  const texto = encodeURIComponent('Olá, preciso de suporte no AgroMarket.');

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
