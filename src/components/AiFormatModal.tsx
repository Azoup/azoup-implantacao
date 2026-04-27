import { useEffect, useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { formatTextWithAi, type AiApplyMode, type AiFormatIntent } from '../services/aiFormatter'
import { useUiFeedback } from '../ui/UiFeedbackContext'

type Props = {
  open: boolean
  title?: string
  text: string
  intent: AiFormatIntent
  onClose: () => void
  onApply: (next: string, mode: AiApplyMode) => void
}

export function AiFormatModal({ open, title = 'Formatar com IA', text, intent, onClose, onApply }: Props) {
  const { toastWarn, toastError } = useUiFeedback()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [mode, setMode] = useState<AiApplyMode>('append')
  const [generatedBy, setGeneratedBy] = useState<'ai' | 'local_fallback' | null>(null)
  const canGenerate = text.trim().length >= 12

  useEffect(() => {
    if (!open) return
    setResult('')
    setGeneratedBy(null)
    setMode('append')
  }, [open, text, intent])

  const preview = useMemo(() => {
    if (!result.trim()) return text
    if (mode === 'replace') return result
    return text.trim() ? `${text.trim()}\n\n${result.trim()}` : result
  }, [text, result, mode])

  async function onGenerate() {
    if (!canGenerate) {
      toastWarn('Digite ao menos 12 caracteres para estruturar.')
      return
    }
    setLoading(true)
    try {
      const out = await formatTextWithAi(text, intent)
      setResult(out.formattedText)
      setGeneratedBy(out.source)
      if (!out.formattedText.trim()) {
        toastWarn('Não houve mudanças relevantes para sugerir.')
      } else if (out.source === 'local_fallback') {
        toastWarn('IA externa indisponível agora. Foi usada estruturação local.')
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao formatar o conteúdo.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !loading && onClose()}>
      <div className="modal modal--ai-format" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="ai-format__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} disabled={loading}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p className="muted ai-format__lead">Escolha o modo, gere a sugestao e revise antes de aplicar.</p>

        <div className="ai-format__mode" role="group" aria-label="Modo de aplicacao">
          <button
            type="button"
            className={'btn btn--sm ' + (mode === 'append' ? 'btn--primary' : 'btn--ghost')}
            onClick={() => setMode('append')}
            disabled={loading}
          >
            Inserir abaixo
          </button>
          <button
            type="button"
            className={'btn btn--sm ' + (mode === 'replace' ? 'btn--primary' : 'btn--ghost')}
            onClick={() => setMode('replace')}
            disabled={loading}
          >
            Substituir texto
          </button>
          <button type="button" className="btn btn--sm ai-format__generate" onClick={() => void onGenerate()} disabled={loading}>
            <Sparkles size={15} strokeWidth={2} />
            {loading ? 'Formatando...' : 'Gerar sugestao'}
          </button>
        </div>

        <div className="ai-format__grid">
          <label className="field ai-format__box">
            <span>Texto atual</span>
            <textarea className="input ai-format__textarea" rows={10} value={text} readOnly />
          </label>
          <label className="field ai-format__box">
            <span>
              Previa {generatedBy ? `(${generatedBy === 'ai' ? 'IA' : 'local'})` : ''}
            </span>
            <textarea className="input ai-format__textarea" rows={10} value={preview} readOnly />
          </label>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onApply(result.trim(), mode)}
            disabled={loading || !result.trim()}
          >
            Aplicar formatacao
          </button>
        </div>
      </div>
    </div>
  )
}
