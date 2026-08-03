'use client';

import { ReactNode, useLayoutEffect } from 'react';
import { localDateISO } from './incubacaoPresets';

export default function IncubacaoMobileGuard({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    try {
      localStorage.setItem(`agro-incubacao-alert-${localDateISO()}`, '1');
    } catch {
      // O módulo continua funcionando mesmo quando o armazenamento não está disponível.
    }
  }, []);

  return children;
}
