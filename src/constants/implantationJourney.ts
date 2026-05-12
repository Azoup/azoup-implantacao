/**
 * Conteúdo da jornada de implantação (Azoup) — usado na página dedicada e alinhado ao PDF oficial em /docs.
 */
export type ImplantationJourneyIconKey =
  | 'mail'
  | 'whatsapp'
  | 'users'
  | 'clipboard'
  | 'calendar'
  | 'chat'
  | 'spreadsheet'
  | 'download'
  | 'ticket'
  | 'database'
  | 'pencil'
  | 'upload'
  | 'book'
  | 'calendarRange'
  | 'check'
  | 'fileText'
  | 'chart'
  | 'flag'
  | 'headset'

export type ImplantationJourneyStep = {
  n: number
  /** Quando definido, exibe faixa de fase acima desta etapa */
  phase?: string
  title: string
  /** Texto com trechos em **negrito**; URLs https:// são detectados e viram links */
  body: string
  icon: ImplantationJourneyIconKey
}

export const IMPLANTATION_JOURNEY_INTRO = {
  objective:
    'Registrar o método de implantação após contratação: contato, alinhamento, importação de dados, preparação da base, cronograma, execução e encerramento.',
  control:
    'A **Implantação Azoup** concentra projeto, responsáveis, fases e tarefas. Antes o controle e a documentação dos projetos de implantação eram feitos no **Trello**; a referência oficial passa a ser a **Implantação Azoup**.',
  toolsTitle: 'Ferramentas',
}

/** Linhas da seção Ferramentas (lista no app e espelho no HTML/PDF). */
export type ImplantationToolPart =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string }
  /** Segundo nome em destaque na mesma linha (ex.: Google Meet, #infoclientes) */
  | { type: 'tag'; value: string }

export type ImplantationToolLine = {
  name: string
  parts: ImplantationToolPart[]
}

export const IMPLANTATION_TOOL_LINES: ImplantationToolLine[] = [
  {
    name: 'E-mail',
    parts: [
      { type: 'text', value: ' corporativo em ' },
      { type: 'link', href: 'https://titan.hostgator.com.br/mail/', label: 'titan.hostgator.com.br/mail' },
      { type: 'text', value: '.' },
    ],
  },
  {
    name: 'WhatsApp',
    parts: [{ type: 'text', value: ' com o cliente.' }],
  },
  {
    name: 'Google Agenda',
    parts: [
      { type: 'text', value: ' e ' },
      { type: 'tag', value: 'Google Meet' },
      { type: 'text', value: ' para agendamentos e videoconferência.' },
    ],
  },
  {
    name: 'FileZilla',
    parts: [{ type: 'text', value: ' envio da base (FTP/SFTP).' }],
  },
  {
    name: 'IBExpert',
    parts: [{ type: 'text', value: ' acesso à base .FDB.' }],
  },
  {
    name: 'Notepad++',
    parts: [{ type: 'text', value: ' edição auxiliar de textos.' }],
  },
  {
    name: 'Discord',
    parts: [
      { type: 'text', value: ' comunicação interna e canal ' },
      { type: 'tag', value: '#infoclientes' },
      { type: 'text', value: '.' },
    ],
  },
]

export const IMPLANTATION_JOURNEY_STEPS: ImplantationJourneyStep[] = [
  {
    n: 1,
    phase: 'Entrada do projeto',
    title: 'Verificação do e-mail',
    body:
      'Receber novos projetos de implantação por e-mail do **financeiro/comercial Azoup** em https://titan.hostgator.com.br/mail/ . Conferir dados e anexos; abrir ou atualizar o projeto na **Implantação Azoup** para rastreabilidade.',
    icon: 'mail',
  },
  {
    n: 2,
    phase: 'Primeiro contato',
    title: 'Contato no WhatsApp',
    body: 'Adicionar o contato do cliente no **WhatsApp** como canal ágil principal durante a implantação.',
    icon: 'whatsapp',
  },
  {
    n: 3,
    title: 'Primeiro contato e apresentação',
    body: 'Apresentar a equipe de implantação, o papel do implantador e os próximos passos esperados pelo cliente.',
    icon: 'users',
  },
  {
    n: 4,
    title: 'Formulário de boas-vindas',
    body: 'Enviar o formulário de boas-vindas para coleta de informações iniciais e alinhamento de expectativas.',
    icon: 'clipboard',
  },
  {
    n: 5,
    phase: 'Alinhamento',
    title: 'Agendamento da reunião de alinhamento',
    body:
      'Combinar data, participantes e pauta com **Google Agenda** (reuniões em **Google Meet** quando aplicável); registrar compromissos no cronograma na **Implantação Azoup** quando houver rascunho.',
    icon: 'calendar',
  },
  {
    n: 6,
    title: 'Reunião de alinhamento',
    body:
      'Realizar a reunião com o cliente (em geral por **Google Meet**): escopo, módulos, particularidades, riscos e combinados da implantação.',
    icon: 'chat',
  },
  {
    n: 7,
    phase: 'Dados para importação',
    title: 'Planilha para preenchimento',
    body: 'Enviar ao cliente a planilha com os dados necessários à importação no sistema.',
    icon: 'spreadsheet',
  },
  {
    n: 8,
    title: 'Planilha preenchida pelo cliente',
    body: 'Baixar e conferir o arquivo recebido; validar consistência básica antes de encaminhar à importação.',
    icon: 'download',
  },
  {
    n: 9,
    title: 'Ticket — Equipe de Desenvolvimento',
    body:
      'Abrir ticket para a **Equipe de Desenvolvimento** importar os dados das planilhas, com anexos e observações técnicas.',
    icon: 'ticket',
  },
  {
    n: 10,
    phase: 'Base e ambiente',
    title: 'Criação da base .FDB',
    body: 'Criar a base do cliente copiando das **bases padrão**, alinhada ao contratado.',
    icon: 'database',
  },
  {
    n: 11,
    title: 'Ajustes na tabela Empresa',
    body:
      'Com **IBExpert**, acessar a base e ajustar **CNPJ** e **IE** na tabela **Empresa** conforme o cliente. Use **Notepad++** para anotações ou arquivos de texto auxiliares, quando necessário.',
    icon: 'pencil',
  },
  {
    n: 12,
    title: 'Publicação da base (.FDB)',
    body: 'Subir o arquivo no ambiente acordado com **FileZilla** (FTP/SFTP), seguindo o procedimento interno.',
    icon: 'upload',
  },
  {
    n: 13,
    title: 'Documentação — #infoclientes (Discord)',
    body:
      'Documentar acesso à base e informações relevantes no **Discord**, canal **#infoclientes**, para a equipe.',
    icon: 'book',
  },
  {
    n: 14,
    phase: 'Cronograma e execução',
    title: 'Elaboração do cronograma',
    body:
      'Definir datas de instalação, configuração, treinamentos e viradas; publicar na **Implantação Azoup** como referência do projeto.',
    icon: 'calendarRange',
  },
  {
    n: 15,
    title: 'Execução das agendas',
    body: 'Executar instalação remota, configurações, treinamentos por módulo e virada, conforme cronograma aprovado.',
    icon: 'check',
  },
  {
    n: 16,
    title: 'Documentação das agendas',
    body:
      'Registrar o realizado em cada agenda (evidências, pendências, próximos passos) na **Implantação Azoup** e no **Discord** quando couber.',
    icon: 'fileText',
  },
  {
    n: 17,
    phase: 'Encerramento',
    title: 'Validação de uso',
    body: 'Validar uso com o cliente após treinamentos e virada; tirar dúvidas e confirmar aderência ao combinado.',
    icon: 'chart',
  },
  {
    n: 18,
    title: 'Finalização do projeto',
    body: 'Formalizar encerramento: comunicar partes, pendências registradas e status final na **Implantação Azoup**.',
    icon: 'flag',
  },
  {
    n: 19,
    title: 'Passagem ao suporte técnico',
    body: 'Repasse ao **suporte técnico** com particularidades do cliente, contatos e documentação para o dia a dia.',
    icon: 'headset',
  },
]
