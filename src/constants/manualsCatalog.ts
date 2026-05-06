/** Público-alvo do manual (filtro por aba na UI). */
export type ManualAudience = 'internal' | 'clients'

export type ManualDef = {
  id: string
  title: string
  audience: ManualAudience
  description: string
  /** Termos extras para busca (opcional). */
  keywords?: string[]
}

export const MANUALS: ManualDef[] = [
  {
    id: 'woocommerce-azoup',
    title: 'Configuração da integração e-commerce (WooCommerce)',
    audience: 'internal',
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
