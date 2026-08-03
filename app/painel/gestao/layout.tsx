import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'AgroGestão - Estoque e Vendas',
  description: 'Aplicativo de gestão de produtos, estoque, vendas, clientes e recebimentos para pequenos produtores.',
  manifest: '/agrogestao-manifest.json',
  applicationName: 'AgroGestão',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AgroGestão'
  },
  icons: {
    icon: [
      {
        url: '/agrogestao-icon-192.svg',
        type: 'image/svg+xml'
      }
    ],
    apple: '/icon-192.png'
  }
};

export const viewport: Viewport = {
  themeColor: '#0b3d25',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function AgroGestaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
