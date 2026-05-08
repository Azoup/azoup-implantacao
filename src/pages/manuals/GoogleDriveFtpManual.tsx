import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, X, ZoomIn } from 'lucide-react'

function ManualFigure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen, closeLightbox])

  const lightbox =
    lightboxOpen && !imgFailed
      ? createPortal(
          <div
            className="manual-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Imagem ampliada do manual"
          >
            <button
              type="button"
              className="manual-lightbox__backdrop"
              onClick={closeLightbox}
              aria-label="Fechar visualização ampliada"
            />
            <div className="manual-lightbox__panel">
              <div className="manual-lightbox__img-wrap">
                <button
                  type="button"
                  className="manual-lightbox__close"
                  onClick={closeLightbox}
                  aria-label="Fechar"
                >
                  <X size={22} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                </button>
                <img src={src} alt={alt} className="manual-lightbox__img" decoding="async" />
              </div>
              {caption ? <p className="manual-lightbox__caption">{caption}</p> : null}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <figure className="manual-figure">
        <div className="manual-figure__frame">
          {imgFailed ? (
            <p className="manual-figure__missing">
              Imagem não encontrada. Coloque o PNG em{' '}
              <code>public/manuals/drive-ftp/explorer-ftp-azoup.png</code>.
            </p>
          ) : (
            <button
              type="button"
              className="manual-figure__zoom-trigger"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Ampliar imagem: ${alt}`}
            >
              <img
                src={src}
                alt=""
                className="manual-figure__img"
                loading="lazy"
                decoding="async"
                onError={() => setImgFailed(true)}
              />
              <span className="manual-figure__zoom-hint" aria-hidden>
                <ZoomIn size={20} strokeWidth={2} absoluteStrokeWidth />
                <span className="manual-figure__zoom-hint-text">Ampliar</span>
              </span>
            </button>
          )}
        </div>
        <figcaption className="manual-figure__caption">{caption}</figcaption>
      </figure>
      {lightbox}
    </>
  )
}

function ManualPhase({
  step,
  title,
  id,
  children,
}: {
  step: number
  title: string
  id?: string
  children: ReactNode
}) {
  return (
    <section className="manual-phase" id={id}>
      <div className="manual-phase__inner">
        <header className="manual-phase__head">
          <span className="manual-phase__badge" aria-hidden>
            {step}
          </span>
          <h2 className="manual-phase__title">{title}</h2>
        </header>
        <div className="manual-phase__body">{children}</div>
      </div>
    </section>
  )
}

const SIGNUP_URL = 'https://accounts.google.com/signupwithoutgmail?utm'
const DRIVE_DOWNLOAD_URL = 'https://www.google.com/intl/pt-BR/drive/download/'

export function GoogleDriveFtpManual() {
  return (
    <div className="manual-body">
      <p className="manual-body__lead">
        <strong>Documento interno Azoup</strong> — guia rápido pra qualquer pessoa da equipe acessar o{' '}
        <strong>FTP-AZOUP</strong> direto pelo <strong>Windows Explorer</strong>, como se fosse uma unidade de rede.
        Em três blocos: <strong>criar a conta Google @azoup.com.br</strong>, <strong>instalar o Drive para Desktop</strong>{' '}
        e <strong>localizar a pasta no Explorer</strong>.
      </p>

      <p className="manual-body__disclaimer">
        Antes de começar, peça ao administrador da Azoup pra criar a sua conta Workspace (ex.:{' '}
        <code>seu.nome@azoup.com.br</code>) — sem isso, o cadastro abaixo não conecta no Drive Compartilhado{' '}
        <strong>FTP-AZOUP</strong>. Após terminar os 3 passos, <strong>avise o administrador novamente</strong> pra
        liberar o seu acesso ao Drive Compartilhado.
      </p>

      <nav className="manual-toc" aria-label="Atalhos neste manual">
        <span className="manual-toc__label">Neste manual</span>
        <ul className="manual-toc__list">
          <li>
            <a href="#drive-prep">Antes de começar</a>
          </li>
          <li>
            <a href="#drive-fluxo">Fluxo resumido</a>
          </li>
          <li>
            <a href="#drive-porque">Por que conta @azoup</a>
          </li>
          <li>
            <a href="#drive-conta">1 · Criar conta Google @azoup</a>
          </li>
          <li>
            <a href="#drive-instalar">2 · Instalar o Drive para Desktop</a>
          </li>
          <li>
            <a href="#drive-explorer">3 · Acessar pelo Explorer</a>
          </li>
          <li>
            <a href="#drive-admin">Aviso ao admin</a>
          </li>
          <li>
            <a href="#drive-faq">Dúvidas comuns</a>
          </li>
        </ul>
      </nav>

      <div className="manual-prelude">
        <section className="manual-section manual-section--card" id="drive-prep">
          <h2 className="manual-section__title">Antes de começar</h2>
          <ul className="manual-list">
            <li>
              Você precisa do seu e-mail <strong>@azoup.com.br</strong> já criado pelo admin.
            </li>
            <li>
              Tenha o <strong>celular por perto</strong> — o Google pode pedir um QR code rapidinho (sem cadastrar número, ver passo 1).
            </li>
            <li>
              No PC, você vai precisar de <strong>permissão pra instalar programas</strong> (admin local ou pedir ao TI).
            </li>
            <li>
              Conexão estável — o Drive trabalha em modo <em>streaming</em> (puxa arquivo só quando abre).
            </li>
          </ul>
        </section>

        <section className="manual-section manual-section--card" id="drive-fluxo">
          <h2 className="manual-section__title">Fluxo resumido (3 blocos)</h2>
          <ol className="manual-steps manual-steps--compact">
            <li>
              <strong>Conta Google</strong> — cadastrar a Conta Google usando o seu e-mail{' '}
              <code>@azoup.com.br</code>.
            </li>
            <li>
              <strong>Drive para Desktop</strong> — baixar, instalar e logar com a conta criada.
            </li>
            <li>
              <strong>Windows Explorer</strong> — abrir <code>G:\Drives compartilhados\FTP-AZOUP</code> e usar
              normal.
            </li>
          </ol>
        </section>
      </div>

      <section className="manual-section manual-section--rationale" id="drive-porque">
        <header className="manual-section__rationale-head">
          <h2 className="manual-section__title">Por que sua Conta Google precisa ser a @azoup</h2>
          <p className="manual-section__intro">
            Esse é o ponto mais ignorado e o que mais trava as pessoas. <strong>Não logue com a sua conta
            pessoal @gmail.com</strong> — o cadastro tem que ser na sua identidade Azoup. Existem dois motivos
            objetivos pra isso ser obrigatório.
          </p>
        </header>

        <div className="manual-rationale">
          <article className="manual-rationale__item">
            <div className="manual-rationale__heading">
              <span className="manual-rationale__index" aria-hidden>
                1
              </span>
              <h3 className="manual-rationale__title">Exigência do Google</h3>
            </div>
            <p>
              O próprio Google bloqueia o compartilhamento. Quando o admin tenta liberar seu acesso ao{' '}
              <strong>FTP-AZOUP</strong>, aparece a mensagem abaixo: <em>"Ainda não é possível compartilhar
              com endereços de e-mail sem uma Conta do Google"</em>. Ou seja, sem cadastrar a Conta Google
              com seu e-mail Azoup primeiro, ninguém consegue te dar acesso — a culpa não é do TI, é regra
              do Google.
            </p>
            <ManualFigure
              src="/manuals/drive-ftp/compartilhar-exige-conta-google.png"
              alt="Mensagem do Google Drive: 'Ainda não é possível compartilhar com endereços de e-mail sem uma Conta do Google.' Aparece ao tentar adicionar um e-mail @azoup.com.br como participante de um Drive Compartilhado."
              caption="Diálogo de Gerenciar participantes do Drive Compartilhado. Sem Conta Google ativa naquele e-mail, o Google bloqueia o convite."
            />
          </article>

          <article className="manual-rationale__item">
            <div className="manual-rationale__heading">
              <span className="manual-rationale__index" aria-hidden>
                2
              </span>
              <h3 className="manual-rationale__title">Rastreabilidade — quem fez o quê</h3>
            </div>
            <p>
              Toda alteração no FTP-AZOUP fica <strong>registrada</strong> com o nome de quem fez: criar
              pasta, mover arquivo, editar planilha, deletar. Isso é o que permite à empresa <strong>auditar
              ações</strong> e descobrir, dias depois, quem ajustou um arquivo importante. No print abaixo,
              dá pra ver a coluna <em>"Modificado por"</em> mostrando <code>vinicius.lameu</code> como autor
              da pasta <strong>TESTE</strong>. Se você logar com conta pessoal/aleatória, esse rastro fica
              inútil — ou pior, atribui ações suas a um nome que ninguém sabe quem é.
            </p>
            <ManualFigure
              src="/manuals/drive-ftp/auditoria-modificador-drive.png"
              alt="Drive Compartilhado FTP-AZOUP / IMPLANTAÇÃO mostrando lista de pastas e a coluna 'Modificado por' com o usuário 'vinicius.lameu' destacado na pasta TESTE."
              caption="Coluna 'Modificado por' do Drive: cada ação é auditável pelo nome real do colaborador Azoup."
            />
          </article>
        </div>

        <p className="manual-note">
          <strong>Resumo prático:</strong> use a Conta Google com seu e-mail{' '}
          <code>seu.nome@azoup.com.br</code> — o Google libera o compartilhamento e o histórico do FTP fica
          limpo, com seu nome real em cada alteração.
        </p>
      </section>

      <div className="manual-flow" aria-label="Passo a passo principal">
        <ManualPhase
          step={1}
          title="Criar Conta Google com o e-mail @azoup.com.br"
          id="drive-conta"
        >
          <p className="manual-phase__intro">
            A página abaixo é a <strong>única correta</strong>: ela permite criar Conta Google sem precisar
            usar um endereço <code>@gmail.com</code>. Ou seja, dá pra cadastrar com o seu{' '}
            <code>seu.nome@azoup.com.br</code>.
          </p>

          <p className="manual-microsteps__lead">
            <strong>Passo a passo</strong>
          </p>
          <ol className="manual-microsteps">
            <li>
              Abra o link oficial:{' '}
              <a
                href={SIGNUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="manual-link"
              >
                accounts.google.com/signupwithoutgmail
                <ExternalLink size={14} strokeWidth={2} absoluteStrokeWidth aria-hidden />
              </a>
              .
            </li>
            <li>
              Preencha <strong>Nome</strong>, <strong>Sobrenome</strong>, data de nascimento e gênero conforme
              solicitado.
            </li>
            <li>
              No campo <strong>"Endereço de e-mail"</strong>, digite o seu e-mail Azoup completo (ex.:{' '}
              <code>vinicius.lameu@azoup.com.br</code>) e crie uma <strong>senha forte</strong>.
            </li>
            <li>
              <strong>Verificação por QR code:</strong> em alguns casos o Google exige escanear um QR pelo{' '}
              <strong>celular</strong> só pra confirmar que você não é robô. Faça a leitura — é uma conferência
              rápida, <strong>não é cadastro do número</strong>.
            </li>
            <li>
              Quando aparecer a tela <strong>"Adicionar telefone para sua conta"</strong>, clique em{' '}
              <strong>Pular</strong>. <em>Não</em> cadastre o número pessoal.
            </li>
            <li>
              Aceite os termos e finalize. Pronto — agora existe uma <strong>Conta Google</strong> usando seu
              e-mail Azoup como login.
            </li>
          </ol>

          <p className="manual-note">
            <strong>Calma com o QR code.</strong> Essa etapa não vincula seu celular à empresa nem à conta de
            forma permanente. É uma exigência <strong>antifraude do Google</strong>; depois você pode pular o
            cadastro do número e seguir normalmente.
          </p>

          <p className="manual-note">
            <strong>Se o Google reclamar que o e-mail já existe</strong> — significa que ele já está em uso
            como Conta Google. Avise o admin: ele resolve pelo <code>admin.google.com</code>{' '}
            (transferência/reivindicação de conta em conflito) e te chama pra clicar em "Aceitar".
          </p>
        </ManualPhase>

        <ManualPhase
          step={2}
          title="Baixar e instalar o Google Drive para Desktop"
          id="drive-instalar"
        >
          <p className="manual-phase__intro">
            O <strong>Drive para Desktop</strong> é o app oficial do Google que cria uma <strong>letra de
            unidade</strong> no seu PC (tipo <code>G:</code>). Os arquivos do FTP-AZOUP aparecem como pastas
            normais no Explorer — sem precisar abrir o navegador toda hora.
          </p>

          <p className="manual-microsteps__lead">
            <strong>Passo a passo</strong>
          </p>
          <ol className="manual-microsteps">
            <li>
              Abra o link oficial:{' '}
              <a
                href={DRIVE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="manual-link"
              >
                google.com/drive/download
                <ExternalLink size={14} strokeWidth={2} absoluteStrokeWidth aria-hidden />
              </a>
              .
            </li>
            <li>
              Clique em <strong>"Baixar Drive para computador"</strong> (botão azul). Vai baixar o instalador{' '}
              <code>GoogleDriveSetup.exe</code>.
            </li>
            <li>
              Execute o instalador <strong>como administrador</strong> (botão direito → "Executar como
              administrador") e siga o assistente até concluir.
            </li>
            <li>
              Quando terminar, abra o <strong>Drive para Desktop</strong> no menu Iniciar — vai aparecer uma
              tela pedindo pra <strong>fazer login</strong>.
            </li>
            <li>
              Faça login com a Conta Google que você criou no passo 1 (<code>seu.nome@azoup.com.br</code>) e{' '}
              autorize todas as permissões que o Google pedir.
            </li>
            <li>
              Na pergunta sobre o <strong>modo de sincronização</strong>, escolha{' '}
              <strong>"Transmitir arquivos"</strong> (streaming). Isso evita ocupar espaço em disco — o
              arquivo só baixa quando você abre.
            </li>
            <li>
              Aguarde a mensagem <strong>"Sincronização concluída"</strong> no ícone do Drive na barra de
              tarefas (ao lado do relógio).
            </li>
          </ol>

          <p className="manual-note">
            <strong>Não confunda.</strong> Você quer o app chamado <strong>"Google Drive para Desktop"</strong>
            . Existiu outro chamado "Backup e Sincronização" que foi descontinuado pelo Google — ignore.
          </p>
        </ManualPhase>

        <ManualPhase
          step={3}
          title="Acessar o FTP-AZOUP pelo Windows Explorer"
          id="drive-explorer"
        >
          <p className="manual-phase__intro">
            Pronto, agora é só usar! Abra o Windows Explorer (<kbd>Win</kbd> + <kbd>E</kbd>) e siga o caminho
            abaixo. Cada PC pode ter uma letra de unidade diferente (<code>G:</code>, <code>H:</code>…), mas o
            ícone do Drive é sempre identificável.
          </p>

          <ManualFigure
            src="/manuals/drive-ftp/explorer-ftp-azoup.png"
            alt="Windows Explorer mostrando Este Computador, Google Drive (G:), Drives compartilhados, FTP-AZOUP com pastas DESENVOLVIMENTO, FINANCEIRO, FTP, IMPLANTAÇÃO, MARKETING, PÚBLICO, SDR e SUPORTE."
            caption="Caminho final no Explorer: Este Computador → Google Drive (G:) → Drives compartilhados → FTP-AZOUP."
          />

          <p className="manual-microsteps__lead">
            <strong>Caminho de navegação</strong>
          </p>
          <ol className="manual-microsteps">
            <li>
              Abra o <strong>Windows Explorer</strong>.
            </li>
            <li>
              Na lateral esquerda, clique em <strong>Este Computador</strong>.
            </li>
            <li>
              Localize a unidade <strong>Google Drive (G:)</strong> e dê duplo-clique.
            </li>
            <li>
              Abra a pasta <strong>Drives compartilhados</strong>.
            </li>
            <li>
              Entre em <strong>FTP-AZOUP</strong> — você verá pastas como{' '}
              <code>DESENVOLVIMENTO</code>, <code>FINANCEIRO</code>, <code>IMPLANTAÇÃO</code>,{' '}
              <code>MARKETING</code>, <code>PÚBLICO</code>, <code>SDR</code>, <code>SUPORTE</code>.
            </li>
          </ol>

          <p className="manual-note">
            <strong>Dica de produtividade.</strong> Botão direito em <strong>FTP-AZOUP</strong> → "Fixar no
            Acesso rápido". Aí ele aparece sempre na lateral esquerda do Explorer, em qualquer janela.
          </p>

          <p className="manual-microsteps__lead">
            <strong>Atalho direto (opcional)</strong>
          </p>
          <pre className="manual-code">
            <code>G:\Drives compartilhados\FTP-AZOUP</code>
          </pre>
          <p>
            Cole esse caminho na barra de endereço do Explorer e tecle <strong>Enter</strong> pra abrir
            direto.
          </p>
        </ManualPhase>
      </div>

      <div className="manual-footer-panels">
        <section className="manual-section manual-section--card" id="drive-admin">
          <h2 className="manual-section__title">Aviso ao administrador</h2>
          <p>
            Depois de concluir os 3 passos, <strong>avise o administrador da Azoup</strong>. A nova Conta
            Google que você criou ainda <strong>não enxerga</strong> o Drive Compartilhado{' '}
            <strong>FTP-AZOUP</strong> — quem libera é o admin, dando a você permissão{' '}
            <strong>"Gerente de conteúdo"</strong> ou <strong>"Colaborador"</strong> no Drive.
          </p>
          <p className="manual-note">
            <strong>Recado curto pra mandar:</strong> <em>"Oi, finalizei o setup do Drive. Pode me liberar
            acesso ao Drive Compartilhado FTP-AZOUP usando minha conta seu.nome@azoup.com.br?"</em>
          </p>
        </section>

        <section className="manual-section manual-section--card" id="drive-faq">
          <h2 className="manual-section__title">Dúvidas comuns</h2>
          <ul className="manual-list">
            <li>
              <strong>Não vejo "Drives compartilhados".</strong> O admin ainda não liberou — ou você logou
              com outro e-mail. Confira no Drive (canto superior direito) qual conta está ativa.
            </li>
            <li>
              <strong>Drive não aparece no Explorer.</strong> Confirme se o ícone do Drive está rodando ao
              lado do relógio. Senão, abra "Google Drive" no menu Iniciar.
            </li>
            <li>
              <strong>Quero usar offline.</strong> Botão direito num arquivo/pasta no Drive →{' '}
              <em>"Disponível off-line"</em>.
            </li>
            <li>
              <strong>Apareceu pasta com (1) ou "Conflito de…".</strong> Duas pessoas editaram o mesmo
              arquivo ao mesmo tempo. Combine com o time, junte as alterações e apague a cópia.
            </li>
            <li>
              <strong>Computador novo.</strong> Repita só os passos 2 e 3 — a conta Google já está criada,
              é só logar no Drive para Desktop.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
