'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get('q') || '');
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    router.push(`/anuncios?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="search-row" style={compact ? { marginTop: 0 } : undefined}>
      <input
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar leitão, ovos férteis, roçagem, caseiro..."
      />
      <button className="btn btn-primary" type="submit"><Search size={18} /> Buscar</button>
    </form>
  );
}
