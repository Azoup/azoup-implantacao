import { useMemo, useRef, useState, type WheelEvent } from 'react'

type Props = {
  src: string
  onApply: (dataUrl: string) => void
  onCancel: () => void
}

const VIEW = 220

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function AnalystAvatarCropper({ src, onApply, onCancel }: Props) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [natural, setNatural] = useState({ w: 1, h: 1 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  const quarterTurns = ((rotation / 90) % 4 + 4) % 4
  const rotatedW = quarterTurns % 2 === 1 ? natural.h : natural.w
  const rotatedH = quarterTurns % 2 === 1 ? natural.w : natural.h
  const baseScale = useMemo(() => Math.max(VIEW / rotatedW, VIEW / rotatedH), [rotatedW, rotatedH])
  const drawW = natural.w * baseScale * zoom
  const drawH = natural.h * baseScale * zoom
  const bboxW = quarterTurns % 2 === 1 ? drawH : drawW
  const bboxH = quarterTurns % 2 === 1 ? drawW : drawH
  const maxX = Math.max(0, (bboxW - VIEW) / 2)
  const maxY = Math.max(0, (bboxH - VIEW) / 2)

  const clampedOffset = {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  }

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, baseX: clampedOffset.x, baseY: clampedOffset.y }
  }

  function moveDrag(clientX: number, clientY: number) {
    const d = dragRef.current
    if (!d) return
    const nextX = d.baseX + (clientX - d.startX)
    const nextY = d.baseY + (clientY - d.startY)
    setOffset({ x: clamp(nextX, -maxX, maxX), y: clamp(nextY, -maxY, maxY) })
  }

  function endDrag() {
    dragRef.current = null
  }

  function resetTransform() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }

  function onWheelZoom(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    const dir = e.deltaY > 0 ? -1 : 1
    setZoom((z) => clamp(Math.round((z + dir * 0.08) * 100) / 100, 1, 3))
  }

  function applyCrop() {
    const canvas = document.createElement('canvas')
    const out = 512
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      const scaleOut = out / VIEW
      ctx.clearRect(0, 0, out, out)
      ctx.save()
      ctx.translate((VIEW / 2 + clampedOffset.x) * scaleOut, (VIEW / 2 + clampedOffset.y) * scaleOut)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, (-drawW * scaleOut) / 2, (-drawH * scaleOut) / 2, drawW * scaleOut, drawH * scaleOut)
      ctx.restore()
      onApply(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = src
  }

  return (
    <section className="avatar-cropper">
      <div className="avatar-cropper__head">
        <strong>Enquadrar foto</strong>
        <span className="muted">Arraste para posicionar e use zoom.</span>
      </div>
      <div
        className="avatar-cropper__viewport"
        onDoubleClick={resetTransform}
        onWheel={onWheelZoom}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={endDrag}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className={'avatar-cropper__image' + (loaded ? '' : ' is-loading')}
          onLoad={(e) => {
            const img = e.currentTarget
            setNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 })
            setLoaded(true)
          }}
          style={{
            width: `${drawW}px`,
            height: `${drawH}px`,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${clampedOffset.x}px, ${clampedOffset.y}px) rotate(${rotation}deg)`,
          }}
        />
      </div>
      <label className="avatar-cropper__zoom">
        <span className="muted">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>
      <div className="avatar-cropper__tune">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRotation((r) => r - 90)}>
          Girar -90°
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRotation((r) => r + 90)}>
          Girar +90°
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={resetTransform}
        >
          Resetar
        </button>
      </div>
      <div className="avatar-cropper__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={applyCrop}>
          Aplicar foto
        </button>
      </div>
    </section>
  )
}
