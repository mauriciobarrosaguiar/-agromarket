'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from 'lucide-react';
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

  function mover(delta: number) {
    setIndex((atual) => (atual + delta + itens.length) % itens.length);
  }

  async function registrarClique(item: PatrocinadoHome) {
    await supabase.rpc('incrementar_patrocinado_clique', { patrocinado_uuid: item.id });
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head-compact">
          <div>
            <span className="badge"><Megaphone size={14} /> Patrocinado</span>
            <h2>Ofertas e parceiros do agro</h2>
            <p>Espaço comercial para marcas, lojas e serviços divulgarem no AgroMarket.</p>
          </div>
          {itens.length > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" type="button" onClick={() => mover(-1)} aria-label="Patrocinado anterior"><ChevronLeft size={18} /></button>
              <button className="btn btn-secondary" type="button" onClick={() => mover(1)} aria-label="Próximo patrocinado"><ChevronRight size={18} /></button>
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          onScroll={() => {
            const el = containerRef.current;
            if (!el) return;
            const largura = el.clientWidth;
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
                style={{ minWidth: '100%', padding: 0, overflow: 'hidden', scrollSnapAlign: 'center', textDecoration: 'none' }}
              >
                <div style={{ minHeight: 250, background: `linear-gradient(90deg, rgba(5,46,22,.72), rgba(5,46,22,.18)), url(${item.imagem_url}) center/cover`, display: 'flex', alignItems: 'end', padding: 18, color: '#fff' }}>
                  <div style={{ maxWidth: 720 }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>Patrocinado</span>
                    <h2 style={{ color: '#fff', margin: '10px 0 6px', fontSize: 'clamp(28px, 5vw, 46px)' }}>{item.titulo}</h2>
                    {item.subtitulo && <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 18, margin: 0 }}>{item.subtitulo}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      {item.nome_anunciante && <span className="badge" style={{ background: '#fff', color: '#14532d' }}>{item.nome_anunciante}</span>}
                      {(item.cidade || item.estado) && <span className="badge" style={{ background: '#fff', color: '#14532d' }}>{item.cidade || 'Cidade'} - {item.estado || 'UF'}</span>}
                      {item.link_url && <span className="badge" style={{ background: '#fff', color: '#14532d' }}><ExternalLink size={14} /> Abrir</span>}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {itens.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 8 }}>
            {itens.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para patrocinado ${i + 1}`}
                style={{ width: i === index ? 22 : 9, height: 9, borderRadius: 999, border: 0, background: i === index ? '#166534' : '#cbd5c0', transition: '.18s ease' }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
