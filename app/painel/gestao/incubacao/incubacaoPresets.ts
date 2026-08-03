export type SpeciesPreset = {
  key: string;
  nome: string;
  emoji: string;
  dias: number;
  temperatura: number;
  umidade: number;
  umidadeEclosao: number;
  ovoscopia1: number;
  ovoscopia2: number | null;
  pararViragem: number;
};

export const SPECIES_PRESETS: SpeciesPreset[] = [
  { key: 'galinha', nome: 'Galinha', emoji: '🐔', dias: 21, temperatura: 37.7, umidade: 52, umidadeEclosao: 68, ovoscopia1: 7, ovoscopia2: 14, pararViragem: 18 },
  { key: 'codorna_japonesa', nome: 'Codorna japonesa', emoji: '🐣', dias: 17, temperatura: 37.7, umidade: 52, umidadeEclosao: 68, ovoscopia1: 7, ovoscopia2: 14, pararViragem: 14 },
  { key: 'codorna_gigante', nome: 'Codorna gigante', emoji: '🐣', dias: 18, temperatura: 37.7, umidade: 52, umidadeEclosao: 68, ovoscopia1: 7, ovoscopia2: 14, pararViragem: 15 },
  { key: 'pato', nome: 'Pato', emoji: '🦆', dias: 28, temperatura: 37.5, umidade: 58, umidadeEclosao: 72, ovoscopia1: 7, ovoscopia2: 21, pararViragem: 25 },
  { key: 'marreco', nome: 'Marreco', emoji: '🦆', dias: 28, temperatura: 37.5, umidade: 58, umidadeEclosao: 72, ovoscopia1: 7, ovoscopia2: 21, pararViragem: 25 },
  { key: 'ganso', nome: 'Ganso', emoji: '🪿', dias: 30, temperatura: 37.5, umidade: 60, umidadeEclosao: 75, ovoscopia1: 7, ovoscopia2: 21, pararViragem: 27 },
  { key: 'peru', nome: 'Peru', emoji: '🦃', dias: 28, temperatura: 37.5, umidade: 55, umidadeEclosao: 70, ovoscopia1: 7, ovoscopia2: 21, pararViragem: 25 },
  { key: 'galinha_angola', nome: 'Galinha-d’angola', emoji: '🐦', dias: 28, temperatura: 37.6, umidade: 55, umidadeEclosao: 70, ovoscopia1: 7, ovoscopia2: 21, pararViragem: 25 },
  { key: 'faisao', nome: 'Faisão', emoji: '🐦', dias: 24, temperatura: 37.6, umidade: 55, umidadeEclosao: 70, ovoscopia1: 7, ovoscopia2: 17, pararViragem: 21 },
  { key: 'perdiz', nome: 'Perdiz', emoji: '🐦', dias: 23, temperatura: 37.6, umidade: 55, umidadeEclosao: 70, ovoscopia1: 7, ovoscopia2: 16, pararViragem: 20 },
  { key: 'avestruz', nome: 'Avestruz', emoji: '🐦', dias: 42, temperatura: 36.2, umidade: 30, umidadeEclosao: 40, ovoscopia1: 14, ovoscopia2: 28, pararViragem: 39 },
  { key: 'personalizada', nome: 'Outra espécie', emoji: '🥚', dias: 21, temperatura: 37.5, umidade: 55, umidadeEclosao: 70, ovoscopia1: 7, ovoscopia2: 14, pararViragem: 18 }
];

export function presetByKey(key: string) {
  return SPECIES_PRESETS.find((item) => item.key === key) || SPECIES_PRESETS[0];
}

export function localDateISO(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(date: string, days: number) {
  const base = new Date(`${date.slice(0, 10)}T12:00:00`);
  base.setDate(base.getDate() + days);
  return localDateISO(base);
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : `${value.slice(0, 10)}T12:00:00`;
  return new Date(normalized).toLocaleDateString('pt-BR');
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function incubationDay(start: string, totalDays: number) {
  const startDate = new Date(`${start.slice(0, 10)}T00:00:00`);
  const today = new Date(`${localDateISO()}T00:00:00`);
  const elapsed = Math.floor((today.getTime() - startDate.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(elapsed, totalDays + 30));
}

export function numberValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}
