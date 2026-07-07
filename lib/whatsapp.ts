export function onlyNumbers(value: string) {
  return value.replace(/\D/g, '');
}

export function formatMoney(value?: number | null, combinar = false) {
  if (combinar || value === null || value === undefined || Number.isNaN(value)) return 'A combinar';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function makeWhatsAppLink(phone: string, title: string) {
  const cleanPhone = onlyNumbers(phone);
  const message = encodeURIComponent(`Olá, vi seu anúncio no AgroMarket e tenho interesse em: ${title}`);
  return `https://wa.me/${cleanPhone}?text=${message}`;
}
