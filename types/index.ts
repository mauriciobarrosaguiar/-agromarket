export type TipoUsuario = 'admin' | 'anunciante' | 'comprador';
export type StatusUsuario = 'ativo' | 'pendente' | 'bloqueado';
export type TipoAnuncio = 'produto' | 'animal' | 'servico' | 'emprego' | 'maquina' | 'equipamento';
export type StatusAnuncio = 'pendente' | 'aprovado' | 'recusado' | 'pausado' | 'vendido' | 'expirado' | 'bloqueado';
export type StatusDenuncia = 'aberta' | 'em_analise' | 'resolvida' | 'ignorada';
export type StatusDestaqueSolicitacao = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'expirado';
export type StatusPatrocinado = 'pendente_pagamento' | 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'expirado';
export type StatusAvaliacaoVendedor = 'aprovada' | 'pendente' | 'oculta' | 'removida';
export type StatusAssinaturaVitrine = 'pendente_pagamento' | 'ativa' | 'vencida' | 'cancelada' | 'gratis_lancamento';
export type StatusPagamentoVitrine = 'pendente' | 'pago' | 'recusado' | 'cancelado' | 'estornado';
export type StatusDocumentoUsuario = 'nao_enviado' | 'pendente' | 'aprovado' | 'recusado';
export type StatusSelfieUsuario = 'nao_enviada' | 'pendente' | 'aprovada' | 'recusada';
export type TipoPlanoMonetizacao = 'destaque' | 'vitrine' | 'assinatura';
export type ProvedorPagamento = 'asaas' | 'efi';
export type AmbientePagamento = 'sandbox' | 'producao';

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
  selfie_status?: StatusSelfieUsuario | string;
  selfie_motivo_recusa?: string | null;
  selfie_verificada_em?: string | null;
  selfie_verificada_por?: string | null;
  documento_url?: string | null;
  documento_status?: StatusDocumentoUsuario | string;
  documento_motivo_recusa?: string | null;
  documento_verificado_em?: string | null;
  documento_verificado_por?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  documento_orgao_emissor?: string | null;
  documento_uf?: string | null;
  cadastro_completo?: boolean;
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

export type Subcategoria = {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  categorias?: Categoria | null;
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
  plano_id?: string | null;
  assinatura_status?: StatusAssinaturaVitrine | string;
  assinatura_inicio?: string | null;
  assinatura_vencimento?: string | null;
  ultimo_pagamento_em?: string | null;
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
  subcategoria_id?: string | null;
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
  subcategorias?: Subcategoria | null;
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

export type AvaliacaoVendedor = {
  id: string;
  vitrine_id: string;
  vendedor_id: string;
  avaliador_id: string;
  anuncio_id?: string | null;
  nota: number;
  comentario?: string | null;
  status: StatusAvaliacaoVendedor;
  created_at?: string;
  updated_at?: string;
};

export type MonetizacaoPlano = {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoPlanoMonetizacao;
  dias?: number | null;
  preco: number;
  descricao?: string | null;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
};

export type PagamentoConfiguracao = {
  id: string;
  provedor: ProvedorPagamento;
  ativo: boolean;
  ambiente: AmbientePagamento;
  nome_exibicao: string;
  pix_chave?: string | null;
  webhook_url?: string | null;
  credenciais_configuradas: boolean;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type VitrinePagamento = {
  id: string;
  vitrine_id: string;
  usuario_id: string;
  plano_id?: string | null;
  valor: number;
  meses: number;
  status: StatusPagamentoVitrine;
  provedor?: string | null;
  referencia_externa?: string | null;
  comprovante_url?: string | null;
  observacao?: string | null;
  admin_id?: string | null;
  pago_em?: string | null;
  vencimento_gerado?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PatrocinadoHome = {
  id: string;
  usuario_id?: string | null;
  vitrine_id?: string | null;
  titulo: string;
  subtitulo?: string | null;
  imagem_url: string;
  link_url?: string | null;
  nome_anunciante?: string | null;
  whatsapp_anunciante?: string | null;
  cidade?: string | null;
  estado?: string | null;
  ordem: number;
  ativo: boolean;
  status?: StatusPatrocinado | string;
  motivo_recusa?: string | null;
  admin_id?: string | null;
  aprovado_em?: string | null;
  inicio_em?: string | null;
  fim_em?: string | null;
  visualizacoes: number;
  cliques: number;
  created_at?: string;
  updated_at?: string;
  vitrines?: Pick<Vitrine, 'nome_vitrine' | 'slug'> | null;
  usuarios?: Pick<Usuario, 'nome' | 'email' | 'whatsapp'> | null;
};

export type AnuncioWhatsappClique = {
  id: string;
  anuncio_id: string;
  vendedor_id: string;
  comprador_id?: string | null;
  comprador_nome?: string | null;
  comprador_email?: string | null;
  comprador_whatsapp?: string | null;
  comprador_cidade?: string | null;
  comprador_estado?: string | null;
  origem: string;
  user_agent?: string | null;
  created_at?: string;
  anuncios?: Pick<Anuncio, 'titulo' | 'slug' | 'cidade' | 'estado'> | null;
};
