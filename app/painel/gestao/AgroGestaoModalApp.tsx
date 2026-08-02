'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { Boxes, PackagePlus, ShoppingCart, UserPlus, X } from 'lucide-react';
import AgroGestaoApp from './AgroGestaoApp';
import styles from './agrogestaoModal.module.css';

type ModalFormId = 'produto-form' | 'estoque-form' | 'venda-form' | 'cliente-form';

const FORM_IDS: ModalFormId[] = [
  'produto-form',
  'estoque-form',
  'venda-form',
  'cliente-form'
];

const ACTIONS: Record<ModalFormId, { label: string; icon: LucideIcon }> = {
  'produto-form': { label: 'Novo produto', icon: Boxes },
  'estoque-form': { label: 'Novo lançamento', icon: PackagePlus },
  'venda-form': { label: 'Nova venda', icon: ShoppingCart },
  'cliente-form': { label: 'Novo cliente', icon: UserPlus }
};

const SUCCESS_MESSAGES: Record<ModalFormId, string[]> = {
  'produto-form': ['Produto cadastrado.', 'Produto atualizado.'],
  'estoque-form': ['Movimentação registrada e estoque atualizado.'],
  'venda-form': ['Venda registrada e estoque baixado automaticamente.'],
  'cliente-form': ['Cliente cadastrado.', 'Cliente atualizado.']
};

function getForm(id: ModalFormId) {
  return document.getElementById(id) as HTMLFormElement | null;
}

function getModalHost(form: HTMLFormElement | null) {
  if (!form) return null;
  return form.closest('div[class*="viewport"]') as HTMLElement | null;
}

function findButtonByText(container: ParentNode, text: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.trim() === text
  );
}

function ensureSaleClientButton() {
  const form = getForm('venda-form');
  if (!form || form.querySelector('[data-agro-add-client]')) return;

  const customerLabel = form.querySelector('label');
  if (!customerLabel) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.agroAddClient = 'true';
  button.className = 'agroInlineClientButton';
  button.innerHTML = '<span>+</span> Cadastrar um novo cliente';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('agro:add-client-from-sale'));
  });
  customerLabel.appendChild(button);
}

export default function AgroGestaoModalApp() {
  const [activeForm, setActiveForm] = useState<ModalFormId | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [returnToSale, setReturnToSale] = useState(false);
  const [modalHost, setModalHost] = useState<HTMLElement | null>(null);

  const activeFormRef = useRef<ModalFormId | null>(null);
  const modalOpenRef = useRef(false);
  const returnToSaleRef = useRef(false);
  const modalHostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    activeFormRef.current = activeForm;
  }, [activeForm]);

  useEffect(() => {
    modalOpenRef.current = modalOpen;
  }, [modalOpen]);

  useEffect(() => {
    returnToSaleRef.current = returnToSale;
  }, [returnToSale]);

  useEffect(() => {
    modalHostRef.current = modalHost;
  }, [modalHost]);

  const updateModalHost = useCallback((form: HTMLFormElement | null) => {
    const host = getModalHost(form);
    if (host && host !== modalHostRef.current) {
      modalHostRef.current = host;
      setModalHost(host);
    }
    return host;
  }, []);

  const waitForForm = useCallback(
    (id: ModalFormId, callback: (form: HTMLFormElement) => void) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        const form = getForm(id);
        attempts += 1;
        if (form) {
          window.clearInterval(timer);
          callback(form);
        } else if (attempts >= 30) {
          window.clearInterval(timer);
        }
      }, 50);
    },
    []
  );

  const clickNavigation = useCallback((label: string) => {
    const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) =>
        button.textContent?.trim() === label &&
        !button.closest('form') &&
        button.dataset.agroModalAction !== 'true'
    );

    const visible = candidates.find(
      (button) => button.offsetWidth > 0 && button.offsetHeight > 0
    );
    (visible || candidates[0])?.click();
  }, []);

  const closeModal = useCallback((resetEdit = true) => {
    const current = activeFormRef.current;

    FORM_IDS.forEach((id) => getForm(id)?.classList.remove('agroModalFormOpen'));
    document.documentElement.classList.remove('agroModalLocked');
    setModalOpen(false);
    modalOpenRef.current = false;

    if (resetEdit && current && ['produto-form', 'cliente-form'].includes(current)) {
      const form = getForm(current);
      const cancelButton = form ? findButtonByText(form, 'Cancelar edição') : undefined;
      cancelButton?.click();
    }
  }, []);

  const openModal = useCallback(
    (id: ModalFormId, fresh = true) => {
      waitForForm(id, (form) => {
        if (fresh && ['produto-form', 'cliente-form'].includes(id)) {
          findButtonByText(form, 'Cancelar edição')?.click();
        }

        FORM_IDS.forEach((formId) =>
          getForm(formId)?.classList.remove('agroModalFormOpen')
        );

        updateModalHost(form);
        form.classList.add('agroModalFormOpen');
        document.documentElement.classList.add('agroModalLocked');
        activeFormRef.current = id;
        setActiveForm(id);
        setModalOpen(true);
        modalOpenRef.current = true;

        if (id === 'venda-form') {
          window.setTimeout(ensureSaleClientButton, 40);
        }
      });
    },
    [updateModalHost, waitForForm]
  );

  useEffect(() => {
    let frame = 0;

    const scanInterface = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const found = FORM_IDS.find((id) => Boolean(getForm(id))) || null;
        const foundForm = found ? getForm(found) : null;

        if (found !== activeFormRef.current) {
          activeFormRef.current = found;
          setActiveForm(found);
        }

        if (foundForm) updateModalHost(foundForm);

        Array.from(document.querySelectorAll<HTMLButtonElement>('button')).forEach(
          (button) => {
            const text = button.textContent?.trim();
            if (
              (text === 'Novo produto' || text === 'Novo cliente') &&
              button.dataset.agroModalAction !== 'true'
            ) {
              button.classList.add('agroLegacyFloatingHidden');
            }
          }
        );

        if (found === 'venda-form') ensureSaleClientButton();

        if (modalOpenRef.current && found) {
          getForm(found)?.classList.add('agroModalFormOpen');
        }
      });
    };

    const observer = new MutationObserver(scanInterface);
    observer.observe(document.body, { childList: true, subtree: true });
    scanInterface();

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest('button');
      if (!button) return;

      const text = button.textContent?.trim() || '';
      if (!text.startsWith('Editar')) return;

      const current = FORM_IDS.find((id) => Boolean(getForm(id)));
      if (current === 'produto-form' || current === 'cliente-form') {
        window.setTimeout(() => openModal(current, false), 100);
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || !FORM_IDS.includes(form.id as ModalFormId)) return;

      const id = form.id as ModalFormId;
      const messages = SUCCESS_MESSAGES[id];
      const before = document.body.innerText;
      let sawCleared = !messages.some((message) => before.includes(message));
      let attempts = 0;

      const timer = window.setInterval(() => {
        const text = document.body.innerText;
        attempts += 1;

        if (!messages.some((message) => text.includes(message))) {
          sawCleared = true;
        }

        if (sawCleared && messages.some((message) => text.includes(message))) {
          window.clearInterval(timer);
          closeModal(false);

          if (id === 'cliente-form' && returnToSaleRef.current) {
            returnToSaleRef.current = false;
            setReturnToSale(false);
            window.setTimeout(() => {
              clickNavigation('Vendas');
              waitForForm('venda-form', () => openModal('venda-form', false));
            }, 140);
          }
        } else if (attempts >= 40) {
          window.clearInterval(timer);
        }
      }, 200);
    };

    const handleAddClientFromSale = () => {
      returnToSaleRef.current = true;
      setReturnToSale(true);
      closeModal(false);
      clickNavigation('Clientes');
      waitForForm('cliente-form', () => openModal('cliente-form', true));
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalOpenRef.current) closeModal(true);
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    window.addEventListener('agro:add-client-from-sale', handleAddClientFromSale);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('agro:add-client-from-sale', handleAddClientFromSale);
      window.removeEventListener('keydown', handleEscape);
      document.documentElement.classList.remove('agroModalLocked');
      FORM_IDS.forEach((id) => getForm(id)?.classList.remove('agroModalFormOpen'));
    };
  }, [clickNavigation, closeModal, openModal, updateModalHost, waitForForm]);

  const action = activeForm ? ACTIONS[activeForm] : null;
  const ActionIcon = action?.icon;

  const modalControls = modalOpen ? (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Fechar formulário"
        onClick={() => closeModal(true)}
      />
      <button
        type="button"
        className={styles.closeButton}
        aria-label="Fechar formulário"
        onClick={() => closeModal(true)}
      >
        <X size={22} />
      </button>
      {returnToSale && activeForm === 'cliente-form' && (
        <div className={styles.returnHint}>
          Cadastre o cliente. Depois você voltará automaticamente para a venda.
        </div>
      )}
    </>
  ) : null;

  return (
    <div className={styles.wrapper}>
      <AgroGestaoApp />

      {action && ActionIcon && !modalOpen && (
        <button
          type="button"
          className={styles.actionButton}
          data-agro-modal-action="true"
          onClick={() => openModal(activeForm as ModalFormId, true)}
        >
          <ActionIcon size={20} />
          {action.label}
        </button>
      )}

      {modalControls && modalHost
        ? createPortal(modalControls, modalHost)
        : modalControls}
    </div>
  );
}

declare global {
  interface WindowEventMap {
    'agro:add-client-from-sale': CustomEvent;
  }
}
