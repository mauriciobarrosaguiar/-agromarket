export const ESTADOS = ['TO', 'GO', 'PA', 'MA', 'MT', 'BA', 'DF', 'PI'];

export const CIDADES_POR_ESTADO: Record<string, string[]> = {
  TO: ['Palmas', 'Araguaina', 'Gurupi', 'Porto Nacional', 'Paraiso do Tocantins', 'Colinas do Tocantins', 'Guarai', 'Miracema do Tocantins', 'Miranorte', 'Dianopolis', 'Natividade', 'Arraias', 'Pedro Afonso', 'Lagoa da Confusao', 'Alvorada', 'Taguatinga', 'Wanderlandia', 'Xambioa', 'Peixe'],
  GO: ['Goiania', 'Aparecida de Goiania', 'Anapolis', 'Rio Verde', 'Formosa', 'Luziania', 'Catalão', 'Itumbiara'],
  PA: ['Belem', 'Ananindeua', 'Maraba', 'Santarem', 'Parauapebas', 'Castanhal', 'Redencao'],
  MA: ['Sao Luis', 'Imperatriz', 'Timon', 'Balsas', 'Acailandia', 'Caxias'],
  MT: ['Cuiaba', 'Varzea Grande', 'Rondonopolis', 'Sinop', 'Sorriso', 'Tangara da Serra'],
  BA: ['Salvador', 'Feira de Santana', 'Vitoria da Conquista', 'Barreiras', 'Luis Eduardo Magalhaes'],
  DF: ['Brasilia', 'Ceilandia', 'Taguatinga', 'Samambaia', 'Planaltina'],
  PI: ['Teresina', 'Parnaiba', 'Picos', 'Floriano']
};

export const UNIDADES = [
  'unidade',
  'kg',
  'saco',
  'caixa',
  'dúzia',
  'bandeja',
  'litro',
  'metro',
  'cabeça',
  'lote',
  'diária',
  'hora'
];

export const TIPOS_ANUNCIO = [
  { value: 'animal', label: 'Animal' },
  { value: 'produto', label: 'Produto Agro' },
  { value: 'servico', label: 'Serviço Rural' },
  { value: 'emprego', label: 'Emprego' },
  { value: 'maquina', label: 'Máquina' },
  { value: 'equipamento', label: 'Equipamento' }
];
