/** Público-alvo do manual (filtro por aba na UI). */
export type ManualAudience = 'internal' | 'clients'

/**
 * Categoria do manual — funciona como "pastinha" dentro de cada audiência
 * (Interno / Clientes). A ordem deste objeto é a ordem em que as categorias
 * aparecem no índice lateral.
 */
export type ManualCategoryId =
  | 'integracoes'
  | 'configuracoes-pc'
  | 'operacional'
  | 'onboarding'

export type ManualCategoryMeta = {
  /** Rótulo curto (cabeçalho de pasta). */
  label: string
  /** Caminho navegável tipo "Internos > Integrações" — só pra acessibilidade. */
  pathLabel: string
  /** Resumo do que cabe nessa categoria (tooltip). */
  description: string
}

export const MANUAL_CATEGORIES: Record<ManualCategoryId, ManualCategoryMeta> = {
  'configuracoes-pc': {
    label: 'Configurações de PC',
    pathLabel: 'Internos > Configurações PC',
    description:
      'Setup das máquinas da equipe: ferramentas, contas, ambientes e acessos do dia a dia.',
  },
  integracoes: {
    label: 'Integrações',
    pathLabel: 'Internos > Integrações',
    description:
      'Conexões entre o ERP / VynTask e sistemas externos (APIs, e-commerce, plugins).',
  },
  operacional: {
    label: 'Operacional',
    pathLabel: 'Internos > Operacional',
    description:
      'Procedimentos recorrentes da operação Azoup: fluxos, checklists e rotinas.',
  },
  onboarding: {
    label: 'Onboarding',
    pathLabel: 'Onboarding',
    description: 'Materiais de chegada para novos colaboradores e clientes.',
  },
}

/** Ordem de renderização das categorias no índice. */
export const MANUAL_CATEGORY_ORDER: ManualCategoryId[] = [
  'configuracoes-pc',
  'integracoes',
  'operacional',
  'onboarding',
]

export type ManualDef = {
  id: string
  title: string
  audience: ManualAudience
  category: ManualCategoryId
  description: string
  /** Termos extras para busca (opcional). */
  keywords?: string[]
}

export const MANUALS: ManualDef[] = [
  {
    id: 'google-drive-ftp-azoup',
    title: 'Google Drive (FTP-AZOUP) no Windows Explorer',
    audience: 'internal',
    category: 'configuracoes-pc',
    description:
      'Criar a conta Google @azoup.com.br, instalar o Drive para Desktop e usar o FTP-AZOUP como unidade de rede no Windows Explorer.',
    keywords: [
      'drive',
      'google drive',
      'ftp',
      'ftp azoup',
      'ftp-azoup',
      'drive compartilhado',
      'drives compartilhados',
      'shared drive',
      'workspace',
      'azoup.com.br',
      'windows explorer',
      'unidade de rede',
      'g:',
      'rede',
      'configuracao pc',
      'configuração pc',
      'setup',
      'maquina nova',
      'colaborador novo',
    ],
  },
  {
    id: 'woocommerce-azoup',
    title: 'Configuração da integração e-commerce (WooCommerce)',
    audience: 'internal',
    category: 'integracoes',
    description:
      'Uso interno: REST API no WordPress, URL wp-json, cadastro WOO no ERP (Parâmetros) e sincronizações.',
    keywords: [
      'woocommerce',
      'woo',
      'wordpress',
      'rest api',
      'api',
      'consumer key',
      'consumer secret',
      'wp-json',
      'integração',
      'e-commerce',
      'ecommerce',
      'erp',
      'azoup',
      'zpfgerencial',
      'parâmetros',
      'sincronização',
    ],
  },
]
