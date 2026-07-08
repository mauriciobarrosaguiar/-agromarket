'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PatrocinadoHome } from '@/types';

type Props = {
  itens: PatrocinadoHome[];
};

function destinoValido(url?: string | null) {
  if (!url) return '#';
  return url;
}

export default function PatrocinadoCarousel({ itens }: Props) {
  const [index, setIndex] = useState(0);
  const [vistos, setVistos] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (itens.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((atual) => (atual + 1) % itens.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [itens.length]);

  useEffect(() => {
    const el = containerRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const item = itens[index];
    if (item && !vistos[item.id]) {
      setVistos((prev) => ({ ...prev, [item.id]: true }));
      supabase.rpc('incrementar_patrocinado_visualizacao', { patrocinado_uuid: item.id }).then(() => null);
    }
  }, [index, itens, vistos]);

  if (!itens.length) return null;

  async function registrarClique(item: PatrocinadoHome) {
    await supabase.rpc('incrementar_patrocinado_clique', { patrocinado_uuid: item.id });
  }

  return (
    <section className="section" style={{ marginTop: 14 }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#14532d' }}>Patrocinado</h2>
          <Link href="/patrocinados" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, color: '#14532d' }}>
            Ver todos <ChevronRight size={18} />
          </Link>
        </div>

        <div
          ref={containerRef}
          onScroll={() => {
            const el = containerRef.current;
            if (!el) return;
            const largura = el.clientWidth * 0.88;
            const proximoIndex = Math.round(el.scrollLeft / Math.max(largura, 1));
            if (proximoIndex !== index && proximoIndex >= 0 && proximoIndex < itens.length) setIndex(proximoIndex);
          }}
          style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 12, padding: '2px 2px 10px', scrollbarWidth: 'none' }}
        >
          {itens.map((item) => {
            const href = destinoValido(item.link_url);
            const externo = href.startsWith('http');
            return (
              <a
                key={item.id}
                href={href}
                target={externo ? '_blank' : undefined}
                rel={externo ? 'noreferrer' : undefined}
                onClick={() => registrarClique(item)}
                className="card"
                style={{ minWidth: 'min(88%, 720px)', padding: 0, overflow: 'hidden', scrollSnapAlign: 'center', textDecoration: 'none', borderRadius: 18 }}
              >
                <img
                  src={item.imagem_url}
                  alt={item.titulo}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: '#e8efe2' }}
                />
              </a>
            );
          })}
        </div>

        {itens.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 4 }}>
            {itens.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para patrocinado ${i + 1}`}
                style={{ width: i === index ? 20 : 9, height: 9, borderRadius: 999, border: 0, background: i === index ? '#166534' : '#dce4d5', transition: '.18s ease' }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
