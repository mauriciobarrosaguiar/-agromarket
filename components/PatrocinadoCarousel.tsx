'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PatrocinadoHome } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meuagromarket.com.br';

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
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior });

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
    }, 11000);

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
    <section className="section sponsored-section">
      <div className="container">
        <div className="section-head sponsored-head">
          <div>
            <h2>Patrocinado</h2>
            <p>Ofertas e parceiros com destaque no AgroMarket.</p>
          </div>
          <Link href="/patrocinados" className="link-strong">Ver todos →</Link>
        </div>

        {itens.length > 0 ? (
          <>
            <div
              className="sponsored-carousel-wrap"
              onMouseEnter={() => setPausado(true)}
              onMouseLeave={() => setPausado(false)}
              onFocus={() => setPausado(true)}
              onBlur={() => setPausado(false)}
            >
              <div ref={containerRef} onScroll={atualizarIndexPeloScroll} className="sponsored-carousel">
                {itens.map((item) => {
                  const href = destinoValido(item);
                  const externo = href.startsWith('http');
                  return (
                    <a key={item.id} href={href} target={externo ? '_blank' : undefined} rel={externo ? 'noreferrer' : undefined} onClick={() => registrarClique(item)} className="sponsored-card">
                      <span className="sponsored-badge"><Sparkles size={13} /> Patrocinado</span>
                      <img src={item.imagem_url} alt={item.titulo} />
                    </a>
                  );
                })}
              </div>

              {itens.length > 1 && (
                <>
                  <button type="button" onClick={() => mudarBanner(index - 1)} aria-label="Patrocinado anterior" className="sponsored-arrow sponsored-arrow-left">
                    <ChevronLeft size={20} />
                  </button>
                  <button type="button" onClick={() => mudarBanner(index + 1)} aria-label="Próximo patrocinado" className="sponsored-arrow sponsored-arrow-right">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {itens.length > 1 && (
              <div className="sponsored-dots">
                {itens.map((item, i) => (
                  <button key={item.id} type="button" onClick={() => mudarBanner(i)} aria-label={`Ir para patrocinado ${i + 1}`} className={i === index ? 'active' : ''} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card sponsored-empty">
            <strong>Espaço patrocinado disponível</strong>
            <p className="muted" style={{ marginBottom: 0 }}>Contrate um banner para aparecer no topo da página inicial.</p>
          </div>
        )}
      </div>
    </section>
  );
}
