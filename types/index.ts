export type TipoUsuario = 'admin' | 'anunciante' | 'comprador';
export type StatusUsuario = 'ativo' | 'pendente' | 'bloqueado';
export type TipoAnuncio = 'produto' | 'animal' | 'servico' | 'emprego' | 'maquina' | 'equipamento';
export type StatusAnuncio = 'pendente' | 'aprovado' | 'recusado' | 'pausado' | 'vendido' | 'expirado' | 'bloqueado';
export type StatusDenuncia = 'aberta' | 'em_analise' | 'resolvida' | 'ignorada';
export type StatusDestaqueSolicitacao = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'expirado';

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
  selfie_url?: string | null;
  documento_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  localizacao_accuracy?: number | null;
  localizacao_capturada_em?: string | null;
  localizacao_validada?: boolean;
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
  logo_object_fit?: 'cover' | 'contain' | string;
  logo_object_position?: string | null;
  banner_object_position?: string | null;
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
  destaque_inicio?: string | null;
  destaque_fim?: string | null;
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

export type Denuncia = {
  id: string;
  anuncio_id: string;
  denunciante_id?: string | null;
  motivo: string;
  descricao?: string | null;
  contato?: string | null;
  status: StatusDenuncia;
  acao_admin?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DestaqueSolicitacao = {
  id: string;
  anuncio_id: string;
  usuario_id: string;
  dias: 7 | 15 | 30;
  status: StatusDestaqueSolicitacao;
  observacao?: string | null;
  admin_id?: string | null;
  aprovado_em?: string | null;
  inicio_em?: string | null;
  fim_em?: string | null;
  created_at?: string;
  updated_at?: string;
};
