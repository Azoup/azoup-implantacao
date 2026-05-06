import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'

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
              Imagem não encontrada. Coloque os PNGs em <code>docs/manuais/prints/</code> (<code>woocommerce1.png</code>,{' '}
              <code>woocommerce2.png</code>) e rode{' '}
              <code>.\public\manuals\woocommerce\copiar-prints.ps1 -FromDocs</code>, ou copie manualmente para{' '}
              <code>public/manuals/woocommerce/</code> como <code>woo-rest-api-chaves.png</code> e{' '}
              <code>azoup-integracao-parametros.png</code>.
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

function ManualPhase({ step, title, id, children }: { step: number; title: string; id?: string; children: ReactNode }) {
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

export function WooCommerceIntegrationManual() {
  return (
    <div className="manual-body">
      <p className="manual-body__lead">
        <strong>Documento interno Azoup</strong> — orientação para a equipe; <strong>não enviar</strong> a clientes finais nem
        tratar como material de portal. O guia cobre a ligação <strong>WordPress + WooCommerce</strong> ao ERP pela{' '}
        <strong>REST API</strong> (<code>ck_…</code> / <code>cs_…</code>), URL <code>wp-json/wc/v2/</code> e cadastro{' '}
        <strong>WOO</strong> no Azoup.
      </p>

      <p className="manual-body__disclaimer">
        Os prints de referência ficam em <code>docs/manuais/prints/</code>; a build usa cópias em{' '}
        <code>public/manuals/woocommerce/</code> (sincronize com <code>copiar-prints.ps1 -FromDocs</code>). Para o material
        final, <strong>recorte</strong> avisos de plugins ou banners que não ajudam no passo a passo e, se necessário,{' '}
        <strong>mascare</strong> chaves ou dados sensíveis. Se as chaves do print já tiverem sido expostas,{' '}
        <strong>revogue-as</strong> no WooCommerce e gere outras.
      </p>

      <nav className="manual-toc" aria-label="Atalhos neste manual">
        <span className="manual-toc__label">Neste manual</span>
        <ul className="manual-toc__list">
          <li>
            <a href="#manual-prep">Pré-requisitos</a>
          </li>
          <li>
            <a href="#manual-fluxo">Fluxo resumido</a>
          </li>
          <li>
            <a href="#woo-chaves">1 · WooCommerce e chaves</a>
          </li>
          <li>
            <a href="#url-api">2 · URL da API</a>
          </li>
          <li>
            <a href="#azoup-parametros">3 · Azoup (Parâmetros)</a>
          </li>
          <li>
            <a href="#manual-seguranca">Segurança</a>
          </li>
          <li>
            <a href="#manual-falhas">Se algo falhar</a>
          </li>
        </ul>
      </nav>

      <div className="manual-prelude">
        <section className="manual-section manual-section--card" id="manual-prep">
          <h2 className="manual-section__title">Pré-requisitos</h2>
          <ul className="manual-list">
            <li>Perfil de administrador no WordPress da loja.</li>
            <li>Mesmo host que será usado na URL da API (idealmente <strong>HTTPS</strong>).</li>
            <li>
              No Azoup, acesso ao <strong>Integração E-commerce</strong> (ex.: <strong>ZPFGerencial</strong> / ZPFConfecção) na
              aba <strong>Parâmetros</strong>.
            </li>
          </ul>
        </section>

        <section className="manual-section manual-section--card" id="manual-fluxo">
          <h2 className="manual-section__title">Fluxo resumido (3 blocos)</h2>
          <ol className="manual-steps manual-steps--compact">
            <li>
              <strong>WooCommerce</strong> — <strong>REST API keys</strong>, criar chave, copiar <code>ck_</code> /{' '}
              <code>cs_</code>.
            </li>
            <li>
              <strong>URL</strong> — <code>https://seudominio/wp-json/wc/v2/</code>.
            </li>
            <li>
              <strong>Azoup</strong> — colar URL e chaves, ajustar empresa / preço / estoque / sincronizações e{' '}
              <strong>F2 · Gravar</strong>.
            </li>
          </ol>
        </section>
      </div>

      <div className="manual-flow" aria-label="Passo a passo principal">
        <ManualPhase step={1} title="WooCommerce — até Consumer key e Consumer secret" id="woo-chaves">
          <p className="manual-phase__intro">
            No admin WordPress, siga a sequência (marcadores do print de referência). Em algumas versões a API fica em{' '}
            <strong>Configurações</strong> → <strong>Avançado</strong>; em outras, <strong>REST API keys</strong> aparece na faixa
            de sub-abas.
          </p>

          <ManualFigure
            src="/manuals/woocommerce/woo-rest-api-chaves.png"
            alt="Print do WordPress: WooCommerce, Configurações, REST API keys, Consumer key e Consumer secret."
            caption="Após gerar a chave, copie na hora (faixa verde). Botões Copiar; QR code opcional; Revogar encerra o par ck/cs."
          />

          <p className="manual-microsteps__lead">
            <strong>Caminho no admin</strong> — execute em ordem:
          </p>
          <ol className="manual-microsteps">
            <li>
              Menu lateral: <strong>WooCommerce</strong>.
            </li>
            <li>
              <strong>Configurações</strong>.
            </li>
            <li>
              Confirmar título <strong>Configurações</strong> do WooCommerce.
            </li>
            <li>
              Sub-abas: <strong>REST API keys</strong> / chaves da API REST.
            </li>
            <li>
              <strong>Adicionar chave</strong> — descrição, <strong>usuário</strong>, <strong>permissões</strong> (Leitura ou
              Leitura/Gravação). Gerar e copiar.
            </li>
          </ol>

          <p className="manual-note">
            Avisos no topo (plugins, builders) podem ser fechados ou <strong>recortados</strong> na imagem do manual.
          </p>
          <p className="manual-note">
            No Azoup, <strong>Code</strong> / <strong>Token</strong> / <strong>Refresh Token</strong> costumam ficar{' '}
            <strong>vazios</strong>. O par da REST clássica é <strong>Consumer Key + Consumer Secret</strong>.
          </p>
        </ManualPhase>

        <ManualPhase step={2} title="Montar a URL da API" id="url-api">
          <p>Domínio público da loja (com ou sem <code>www</code>, igual ao navegador):</p>
          <pre className="manual-code">
            <code>https://nomedalojadocliente.com.br/wp-json/wc/v2/</code>
          </pre>
          <ul className="manual-list">
            <li>
              Mantenha a barra final <code>/</code> se o conector esperar esse formato.
            </li>
            <li>
              Para <code>v3</code>, troque só <code>wc/v2/</code> → <code>wc/v3/</code>.
            </li>
          </ul>
        </ManualPhase>

        <ManualPhase step={3} title="Azoup — Integração E-commerce · Parâmetros" id="azoup-parametros">
          <p className="manual-phase__intro">
            Janela <strong>Integração E-commerce</strong>, aba <strong>Parâmetros</strong> (também <strong>Produtos</strong>,{' '}
            <strong>Log Integração</strong>). Preencha <strong>WOO</strong>, URL e chaves; marque sincronizações à direita;{' '}
            <strong>F2 · Gravar</strong>.
          </p>

          <ManualFigure
            src="/manuals/woocommerce/azoup-integracao-parametros.png"
            alt="ERP: Integração E-commerce, Parâmetros, WOO, URL, chaves, checkboxes, F1–F4."
            caption="Code/Token/Refresh Token vazios. Marque só o escopo combinado (produto, preço, estoque, venda). Grade inferior = resumo gravado."
          />

          <p className="manual-microsteps__lead">
            <strong>No formulário</strong>
          </p>
          <ol className="manual-microsteps">
            <li>
              <strong>Integração</strong> <code>WOO</code>, <strong>Descrição</strong>, <strong>Url</strong> (seção 2), colar{' '}
              <strong>Consumer Key</strong> e <strong>Consumer Secret</strong>.
            </li>
            <li>
              <strong>Origem pedido</strong>, <strong>Empresa</strong>, <strong>Tipo comercialização</strong>,{' '}
              <strong>Ponto estoque</strong>, <strong>Tabela de preço</strong>, <strong>Status</strong>, <strong>Vendedor</strong>,{' '}
              <strong>Máquina</strong>… conforme cadastros.
            </li>
            <li>
              Checkboxes: <strong>Sincronizar venda</strong>, <strong>preço</strong>, <strong>estoque</strong>,{' '}
              <strong>produto</strong> — <strong>Inativa</strong> desmarcado.
            </li>
            <li>
              <strong>F2 · Gravar</strong>. Dúvidas: <strong>Log Integração</strong>.
            </li>
          </ol>
        </ManualPhase>
      </div>

      <div className="manual-footer-panels">
        <section className="manual-section manual-section--card" id="manual-seguranca">
          <h2 className="manual-section__title">Segurança</h2>
          <ul className="manual-list">
            <li>Não divulgue <code>ck_</code> / <code>cs_</code>; em prints públicos, mascare.</li>
            <li>
              Compromisso: <strong>Revogar chave</strong> no WooCommerce e atualizar o Azoup.
            </li>
            <li>Permissão mínima (só leitura quando bastar).</li>
          </ul>
        </section>

        <section className="manual-section manual-section--card" id="manual-falhas">
          <h2 className="manual-section__title">Se algo falhar</h2>
          <ul className="manual-list">
            <li>
              <strong>401</strong> — chave revogada, usuário inativo ou permissão insuficiente.
            </li>
            <li>
              <strong>URL / SSL</strong> — <code>https</code>, hostname; testar <code>/wp-json/</code>.
            </li>
            <li>
              <strong>Firewall / plugin</strong> — REST bloqueada; liberar rota ou IP se aplicável.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
