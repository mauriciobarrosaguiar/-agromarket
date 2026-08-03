'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

type InstallOutcome = 'accepted' | 'dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

function estaInstalado() {
  const navegador = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navegador.standalone === true;
}

export default function AgroGestaoInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);

  useEffect(() => {
    setInstalado(estaInstalado());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/agrogestao-sw.js', { scope: '/painel/gestao/' })
        .catch(() => undefined);
    }

    const prepararInstalacao = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const confirmarInstalacao = () => {
      setInstalado(true);
      setInstallPrompt(null);
      setMostrarAjuda(false);
    };

    window.addEventListener('beforeinstallprompt', prepararInstalacao);
    window.addEventListener('appinstalled', confirmarInstalacao);

    return () => {
      window.removeEventListener('beforeinstallprompt', prepararInstalacao);
      window.removeEventListener('appinstalled', confirmarInstalacao);
    };
  }, []);

  async function instalar() {
    if (!installPrompt) {
      setMostrarAjuda(true);
      return;
    }

    await installPrompt.prompt();
    const escolha = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (escolha.outcome === 'accepted') {
      setInstalado(true);
    }
  }

  if (instalado) return null;

  return (
    <>
      <button
        type="button"
        className="agroInstallButton"
        aria-label="Instalar aplicativo AgroGestão"
        title="Instalar AgroGestão no celular"
        onClick={instalar}
      >
        <Download size={20} />
      </button>

      {mostrarAjuda && (
        <div className="agroInstallBackdrop" role="presentation" onClick={() => setMostrarAjuda(false)}>
          <section
            className="agroInstallDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agro-install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="agroInstallClose"
              aria-label="Fechar"
              onClick={() => setMostrarAjuda(false)}
            >
              <X size={20} />
            </button>

            <span className="agroInstallIcon"><Smartphone size={29} /></span>
            <h2 id="agro-install-title">Instalar AgroGestão</h2>
            <p>Para deixar o sistema como aplicativo no celular:</p>
            <ol>
              <li>Abra esta página no Chrome ou Samsung Internet.</li>
              <li>Toque no menu de três pontos do navegador.</li>
              <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
            </ol>
            <button type="button" className="agroInstallOk" onClick={() => setMostrarAjuda(false)}>
              Entendi
            </button>
          </section>
        </div>
      )}

      <style jsx global>{`
        .agroInstallButton {
          position: fixed;
          top: 13px;
          right: 134px;
          z-index: 1012;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 1px solid #dce3dd;
          border-radius: 11px;
          color: #174f32;
          background: #ffffff;
          box-shadow: 0 7px 20px rgba(15, 75, 47, 0.1);
          cursor: pointer;
          animation: agroInstallPulse 2.8s ease-in-out 1.2s 2;
        }

        body:has([class*='sidebarOpen']) .agroInstallButton {
          opacity: 0;
          pointer-events: none;
        }

        .agroInstallBackdrop {
          position: fixed;
          inset: 0;
          z-index: 5000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(5, 25, 15, 0.67);
          backdrop-filter: blur(5px);
        }

        .agroInstallDialog {
          position: relative;
          width: min(430px, 100%);
          padding: 30px 24px 24px;
          border: 1px solid #dce6de;
          border-radius: 24px;
          color: #17231b;
          background: #ffffff;
          box-shadow: 0 28px 80px rgba(4, 31, 17, 0.35);
        }

        .agroInstallClose {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid #dce3dd;
          border-radius: 10px;
          color: #405047;
          background: #ffffff;
        }

        .agroInstallIcon {
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          border-radius: 17px;
          color: #ffffff;
          background: #0b3d25;
        }

        .agroInstallDialog h2 {
          margin: 0;
          font-family: Georgia, serif;
          font-size: 28px;
        }

        .agroInstallDialog p {
          margin: 10px 0 14px;
          color: #68736c;
          line-height: 1.5;
        }

        .agroInstallDialog ol {
          display: grid;
          gap: 10px;
          margin: 0;
          padding-left: 22px;
          color: #344039;
          line-height: 1.45;
        }

        .agroInstallOk {
          width: 100%;
          min-height: 50px;
          margin-top: 22px;
          border: 0;
          border-radius: 12px;
          color: #ffffff;
          background: #0d4b2d;
          font-weight: 900;
        }

        @keyframes agroInstallPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(15, 91, 55, 0.1); }
        }

        @media (max-width: 820px) {
          .agroInstallButton {
            top: 13px;
            right: 134px;
          }
        }

        @media (max-width: 390px) {
          .agroInstallButton {
            right: 126px;
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  );
}
