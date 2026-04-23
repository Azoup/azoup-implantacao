/**
 * Formulário nativo alinhado ao Google Form "Jornada do cliente Azoup".
 * Fonte de referência: https://docs.google.com/forms/d/e/1FAIpQLSdSy1e16-PLYcM1VEGTnBSmwc6zn1H1A_37mt6R_LGYIfnt_g/viewform
 */
export const AZOUP_WELCOME_GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdSy1e16-PLYcM1VEGTnBSmwc6zn1H1A_37mt6R_LGYIfnt_g/viewform?usp=dialog'

export type AzoupWelcomeField = {
  id: string
  section: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checklist'
  required?: boolean
  options?: string[]
  /** Texto curto abaixo do rótulo: dica ou exemplo de preenchimento. */
  help?: string
  /** Valor de exemplo no campo (HTML placeholder). */
  placeholder?: string
}

export const AZOUP_WELCOME_FORM_FIELDS: AzoupWelcomeField[] = [
  {
    section: '1. Dados gerais',
    id: 'nome_sobrenome',
    label: 'Nome e sobrenome de quem está preenchendo (ex.: Vinícius Souza)',
    type: 'text',
    required: true,
    help: 'Use o mesmo nome que aparecerá nos convites de reunião e no cadastro do sistema.',
    placeholder: 'Ex.: Maria Silva',
  },
  {
    section: '1. Dados gerais',
    id: 'nome_empresa',
    label: 'Nome da empresa (ex.: Azoup Tecnologia)',
    type: 'text',
    required: true,
    help: 'Nome fantasia ou razão social — o que a equipe Azoup deve usar nos documentos.',
    placeholder: 'Ex.: Confecções Aurora Ltda.',
  },
  {
    section: '1. Dados gerais',
    id: 'segmento',
    label: 'Segmento de atuação da empresa (ex.: Moda praia, fitness, uniformes…)',
    type: 'text',
    required: true,
    help: 'Resuma em uma linha o que vocês produzem ou vendem; ajuda a contextualizar a implantação.',
    placeholder: 'Ex.: moda fitness feminina, e-commerce B2C',
  },
  {
    section: '1. Dados gerais',
    id: 'regime_tributario',
    label: 'Qual é o regime tributário da empresa?',
    type: 'select',
    required: true,
    options: [
      'CRT 1 - Simples Nacional',
      'CRT 2 - Simples Nacional - Excesso de sublimite',
      'CRT 3 - Regime normal (Lucro real)',
      'CRT 3 - Regime normal (Lucro presumido)',
      'CRT 4 - MEI (Microempreendedor individual)',
    ],
    help: 'Escolha a opção que consta hoje na NF-e / cadastro fiscal. Em dúvida, pergunte ao contador.',
    placeholder: undefined,
  },
  {
    section: '1. Dados gerais',
    id: 'tempo_mercado',
    label: 'Há quanto tempo a empresa atua no mercado? (ex.: 23 anos)',
    type: 'text',
    required: true,
    help: 'Pode ser número de anos ou “desde 2010”.',
    placeholder: 'Ex.: 12 anos',
  },

  {
    section: '2. Controles atuais',
    id: 'estoque_produtos_acabados',
    label: 'Atualmente, a empresa realiza controle de estoque de produtos acabados?',
    type: 'select',
    required: true,
    options: ['Sim', 'Não'],
    help: 'Considere hoje: planilha, sistema próprio ou sem controle formal.',
  },
  {
    section: '2. Controles atuais',
    id: 'estoque_materia_prima',
    label: 'Atualmente, a empresa realiza controle de estoque de matéria-prima?',
    type: 'select',
    required: true,
    options: ['Sim', 'Não'],
    help: 'Inclui tecidos, aviamentos, insumos usados na produção.',
  },
  {
    section: '2. Controles atuais',
    id: 'controle_producao_hoje',
    label:
      'Hoje, você utiliza algum sistema para controlar a produção? Caso não utilize, descreva brevemente como esse controle é feito (ex.: planilhas e papéis).',
    type: 'textarea',
    required: true,
    help: 'Exemplos: ERP X, planilhas Google, caderno na fábrica, sistema legado…',
    placeholder: 'Ex.: Planilha Excel compartilhada + conferência semanal na fábrica.',
  },

  {
    section: '3. Produtos, matéria-prima e produção',
    id: 'qtd_produtos_comercializados',
    label:
      'Desconsiderando variações de cores e tamanhos, aproximadamente quantos produtos a empresa possui e comercializa? (ex.: cerca de 100 modelos diferentes)',
    type: 'textarea',
    required: true,
    help: 'Conte “modelos” ou SKUs principais, não cada variação de cor/tamanho.',
    placeholder: 'Ex.: cerca de 80 modelos de peças; variações de cor/tamanho à parte.',
  },
  {
    section: '3. Produtos, matéria-prima e produção',
    id: 'qtd_tipos_tecidos_aviamenos',
    label:
      'Desconsiderando variações de cores, aproximadamente quantos tipos de tecidos e aviamentos a empresa utiliza hoje? (ex.: cerca de 70 tipos)',
    type: 'textarea',
    required: true,
    help: 'Uma ordem de grandeza já ajuda (dezenas, centenas…).',
    placeholder: 'Ex.: ~60 tipos de tecido, ~120 itens de aviamento (elásticos, zíperes…).',
  },
  {
    section: '3. Produtos, matéria-prima e produção',
    id: 'qtd_maquinas',
    label: 'Quantas máquinas a empresa possui e que irão utilizar o sistema Azoup? (ex.: 3 desktops e 2 notebooks)',
    type: 'text',
    required: true,
    help: 'Inclua computadores que acessarão o VynTask/Azoup (não precisa listar impressoras).',
    placeholder: 'Ex.: 4 desktops na fábrica + 2 notebooks para gestores',
  },

  {
    section: '4. Equipe e acessos ao sistema',
    id: 'qtd_pessoas_sistema',
    label: 'Quantas pessoas trabalham na empresa e irão utilizar o sistema Azoup?',
    type: 'text',
    required: true,
    help: 'Conte só quem terá login ou usará rotineiramente o sistema.',
    placeholder: 'Ex.: 15 pessoas no total, 8 usarão o sistema diariamente',
  },
  {
    section: '4. Equipe e acessos ao sistema',
    id: 'lista_colaboradores_acessos',
    label:
      'Liste o nome, a função ou setor e as permissões de acesso de cada colaborador (ex.: José — Gerente — acesso total; Elaine — Financeiro — cadastros e financeiro).',
    type: 'textarea',
    required: true,
    help: 'Um colaborador por linha facilita a leitura. Pode usar bullets ou traços “—”.',
    placeholder: 'José — Produção — lançamento de OP e consumo\nAna — Financeiro — NF e contas a pagar',
  },

  {
    section: '5. Organização da implantação',
    id: 'prazo_planilha_produtos_acabados',
    label:
      'Se encaminharmos uma planilha modelo para produtos acabados, em quanto tempo você acredita conseguir devolvê-la preenchida?',
    type: 'textarea',
    required: true,
    help: 'Indique prazo realista (dias úteis ou semanas) e se depende de outra pessoa.',
    placeholder: 'Ex.: em até 5 dias úteis após receber o modelo, com validação do gerente.',
  },
  {
    section: '5. Organização da implantação',
    id: 'indisponibilidade_reunioes',
    label:
      'Sobre reuniões online de alinhamento, treinamentos e revisões: existe algum dia ou horário em que você não tenha disponibilidade?',
    type: 'textarea',
    required: true,
    help: 'Ex.: “não às segundas de manhã”, “após 17h só com aviso prévio”.',
    placeholder: 'Ex.: evitar sextas após 16h; preferência manhã ter–qui.',
  },

  {
    section: '6. Expectativas com o projeto',
    id: 'expectativas_resolvidas',
    label: 'Ao final da implantação, quais pontos, problemas ou dificuldades você espera ter resolvido?',
    type: 'textarea',
    required: true,
    help: 'Liste 3 a 5 itens se possível: visibilidade de estoque, rastreio de OP, integração fiscal…',
    placeholder: 'Ex.: visão única do estoque; fim das planilhas duplicadas; relatórios de produção…',
  },
  {
    section: '6. Expectativas com o projeto',
    id: 'resumo_dia_a_dia',
    label: 'Descreva de forma resumida como funciona hoje o dia a dia da empresa.',
    type: 'textarea',
    required: true,
    help: 'Do pedido ao faturamento: quem faz o quê, em que ferramentas, principais gargalos.',
    placeholder: 'Ex.: pedido no WhatsApp → planilha → produção anota no caderno → NF no sistema X…',
  },
  {
    section: '6. Expectativas com o projeto',
    id: 'particularidades_fluxo',
    label: 'Existe algum processo específico, particularidade ou detalhe do fluxo atual que seja importante informar?',
    type: 'textarea',
    required: true,
    help: 'Ex.: terceirização, multi-filial, grade de tamanhos complexa, devoluções, amostras…',
    placeholder: 'Ex.: 20% das peças passam por lavanderia externa antes da expedição.',
  },

  {
    section: '7. Treinamentos e responsáveis',
    id: 'responsaveis_treinamentos',
    label:
      'Nos treinamentos online (Google Meet), quem serão as pessoas responsáveis por cada etapa ou setor? (ex.: José — geral; Jorge — vendas)',
    type: 'textarea',
    required: true,
    help: 'Indique quem deve ser convidado em cada módulo (produção, estoque, financeiro…).',
    placeholder: 'Carlos — geral / cadastros\nPatrícia — compras e estoque de MP',
  },
  {
    section: '7. Treinamentos e responsáveis',
    id: 'pessoa_chave_projeto',
    label: 'Quem será a pessoa-chave responsável por acompanhar o projeto de implantação e os treinamentos?',
    type: 'text',
    required: true,
    help: 'É o contato principal para decisões e alinhamentos com a Azoup.',
    placeholder: 'Ex.: João Mendes — diretor industrial — joao@empresa.com.br',
  },
]
