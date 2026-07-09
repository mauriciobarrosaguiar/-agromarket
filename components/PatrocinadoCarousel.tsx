'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PatrocinadoHome } from '@/types';

const SITE_URL = 'https://agromarket-two.vercel.app';

type Props = {
  itens: PatrocinadoHome[];
};

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function destinoValido(item: PatrocinadoHome) {
  const telefone = onlyNumbers(item.whatsapp_anunciante);
  if (telefone) {
    const texto = `Olá, vi o patrocinado no AgroMarket e tenho interesse: ${item.titulo}`;
    return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
  }

  if (item.link_url) return item.link_url;
  return SITE_URL;
}

export default function PatrocinadoCarousel({ itens }: Props) {
  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [vistos, setVistos] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);

  const irPara = useCallback((novoIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    const child = el?.children[novoIndex] as HTMLElement | undefined;
    if (!el || !child) return;

    programmaticScrollRef.current = true;
    el.scrollTo({
      left: child.offsetLeft - el.offsetLeft,
      behavior
    });

    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 950);
  }, []);

  function mudarBanner(novoIndex: number) {
    if (!itens.length) return;
    const normalizado = (novoIndex + itens.length) % itens.length;
    setIndex(normalizado);
    irPara(normalizado);
  }

  useEffect(() => {
    if (!itens.length) return;
    const item = itens[index];

    irPara(index);

    if (item && !vistos[item.id]) {
      setVistos((prev) => ({ ...prev, [item.id]: true }));
      supabase.rpc('incrementar_patrocinado_visualizacao', { patrocinado_uuid: item.id }).then(() => null);
    }
  }, [index, itens, irPara, vistos]);

  useEffect(() => {
    if (itens.length <= 1 || pausado) return;

    const timer = window.setInterval(() => {
      setIndex((atual) => (atual + 1) % itens.length);
    }, 8500);

    return () => window.clearInterval(timer);
  }, [itens.length, pausado]);

  async function registrarClique(item: PatrocinadoHome) {
    await supabase.rpc('incrementar_patrocinado_clique', { patrocinado_uuid: item.id });
  }

  function atualizarIndexPeloScroll() {
    const el = containerRef.current;
    if (!el || programmaticScrollRef.current) return;

    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);

    scrollTimerRef.current = window.setTimeout(() => {
      const children = Array.from(el.children) as HTMLElement[];
      let menorDistancia = Number.POSITIVE_INFINITY;
      let novoIndex = index;

      children.forEach((child, i) => {
        const distancia = Math.abs(el.scrollLeft - (child.offsetLeft - el.offsetLeft));
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          novoIndex = i;
        }
      });

      if (novoIndex !== index) setIndex(novoIndex);
    }, 160);
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

        {itens.length > 0 ? (
          <>
            <div
              onMouseEnter={() => setPausado(true)}
              onMouseLeave={() => setPausado(false)}
              onFocus={() => setPausado(true)}
              onBlur={() => setPausado(false)}
              style={{ position: 'relative' }}
            >
              <div
                ref={containerRef}
                onScroll={atualizarIndexPeloScroll}
                style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 14, padding: '2px 0 10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {itens.map((item) => {
                  const href = destinoValido(item);
                  const externo = href.startsWith('http');
                  return (
                    <a
                      key={item.id}
                      href={href}
                      target={externo ? '_blank' : undefined}
                      rel={externo ? 'noreferrer' : undefined}
                      onClick={() => registrarClique(item)}
                      className="card"
                      style={{ flex: '0 0 100%', width: '100%', padding: 0, overflow: 'hidden', scrollSnapAlign: 'start', textDecoration: 'none', borderRadius: 18 }}
                    >
                      <img
                        src={item.imagem_url}
                        alt={item.titulo}
                        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: '#e8efe2', display: 'block' }}
                      />
                    </a>
                  );
                })}
              </div>

              {itens.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => mudarBanner(index - 1)}
                    aria-label="Patrocinado anterior"
                    className="btn btn-secondary"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', borderRadius: 999, padding: 10, boxShadow: '0 12px 30px rgba(0,0,0,.16)' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mudarBanner(index + 1)}
                    aria-label="Próximo patrocinado"
                    className="btn btn-secondary"
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', borderRadius: 999, padding: 10, boxShadow: '0 12px 30px rgba(0,0,0,.16)' }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {itens.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 4 }}>
                {itens.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => mudarBanner(i)}
                    aria-label={`Ir para patrocinado ${i + 1}`}
                    style={{ width: i === index ? 20 : 9, height: 9, borderRadius: 999, border: 0, background: i === index ? '#166534' : '#dce4d5', transition: '.18s ease' }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card" style={{ background: '#f8faf4', marginBottom: 10 }}>
            <strong>Espaço patrocinado disponível</strong>
            <p className="muted" style={{ marginBottom: 0 }}>Contrate um banner para aparecer no topo da página inicial.</p>
          </div>
        )}
      </div>
    </section>
  );
}
