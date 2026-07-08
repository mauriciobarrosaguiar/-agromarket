export type TipoUsuario = 'admin' | 'anunciante' | 'comprador';
export type StatusUsuario = 'ativo' | 'pendente' | 'bloqueado';
export type TipoAnuncio = 'produto' | 'animal' | 'servico' | 'emprego' | 'maquina' | 'equipamento';
export type StatusAnuncio = 'pendente' | 'aprovado' | 'recusado' | 'pausado' | 'vendido' | 'expirado' | 'bloqueado';

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string | null;
  cidade?: string | null;
  estado?: string | null;
  tipo_usuario: TipoUsuario;
  status: StatusUsuario;
  foto_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Categoria = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  icone?: string | null;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type FotoAnuncio = {
  id: string;
  anuncio_id: string;
  url_foto: string;
  ordem: number;
  principal: boolean;
  created_at?: string;
};

export type Vitrine = {
  id: string;
  usuario_id: string;
  nome_vitrine: string;
  slug: string;
  descricao?: string | null;
  foto_url?: string | null;
  banner_url?: string | null;
  cidade?: string | null;
  estado?: string | null;
  whatsapp?: string | null;
  vitrine_ativa: boolean;
  plano: string;
  gratis_ate?: string | null;
  destaque: boolean;
  verificado: boolean;
  total_visualizacoes: number;
  created_at?: string;
  updated_at?: string;
};

export type Anuncio = {
  id: string;
  usuario_id: string;
  categoria_id: string;
  tipo_anuncio: TipoAnuncio;
  titulo: string;
  slug: string;
  descricao: string;
  preco?: number | null;
  preco_a_combinar: boolean;
  quantidade?: number | null;
  unidade?: string | null;
  cidade: string;
  estado: string;
  bairro?: string | null;
  endereco?: string | null;
  referencia?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp: string;
  nome_contato: string;
  status: StatusAnuncio;
  destaque: boolean;
  visualizacoes: number;
  cliques_whatsapp: number;
  data_publicacao?: string | null;
  data_expiracao?: string | null;
  motivo_recusa?: string | null;
  created_at?: string;
  updated_at?: string;
  categorias?: Categoria | null;
  fotos_anuncios?: FotoAnuncio[];
};
