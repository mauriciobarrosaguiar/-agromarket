import type { ReactNode } from 'react';
import PerfilOrganizado from './PerfilOrganizado';

export default function PerfilLayout({ children }: { children: ReactNode }) {
  return <PerfilOrganizado>{children}</PerfilOrganizado>;
}
