/** PDFs servidos em /public/planos — usados como padrão para basic / pro / master */
export const DEFAULT_PLAN_PRESENTATION_URLS: Record<string, string> = {
  basic: '/planos/alinhamento-basic.pdf',
  pro: '/planos/alinhamento-pro.pdf',
  master: '/planos/alinhamento-master.pdf',
}

export const BUILTIN_PLAN_KEYS = new Set(['basic', 'pro', 'master'])

/** Fallback quando o banco ainda não foi inicializado (ex.: visitante em /apresentacoes) */
export const STATIC_PLAN_PRESENTATIONS: {
  key: string
  name: string
  hoursContracted: number
  presentationUrl: string
  blurb: string
}[] = [
  {
    key: 'basic',
    name: 'Basic',
    hoursContracted: 30,
    presentationUrl: DEFAULT_PLAN_PRESENTATION_URLS.basic,
    blurb: '30h: preparativos, vendas, produção (confecção), controle financeiro, estoque PA e BI.',
  },
  {
    key: 'pro',
    name: 'Pró',
    hoursContracted: 50,
    presentationUrl: DEFAULT_PLAN_PRESENTATION_URLS.pro,
    blurb: '50h: vendas, financeiro e boletos, produção e MP, fluxo de caixa, DRE e BI.',
  },
  {
    key: 'master',
    name: 'Master',
    hoursContracted: 70,
    presentationUrl: DEFAULT_PLAN_PRESENTATION_URLS.master,
    blurb: '70h: vendas (Azvendas e e-commerce), financeiro ampliado, produção, compras, Correios e BI.',
  },
]
