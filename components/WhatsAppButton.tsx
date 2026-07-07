import { MessageCircle } from 'lucide-react';
import { makeWhatsAppLink } from '@/lib/whatsapp';

export default function WhatsAppButton({ phone, title, full = false }: { phone: string; title: string; full?: boolean }) {
  return (
    <a className={`btn btn-whatsapp ${full ? 'btn-full' : ''}`} href={makeWhatsAppLink(phone, title)} target="_blank" rel="noreferrer">
      <MessageCircle size={18} /> Chamar no WhatsApp
    </a>
  );
}
