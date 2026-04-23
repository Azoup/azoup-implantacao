/** Fallback exibido enquanto o chunk da rota (lazy) é carregado. */
export function RoutePageFallback() {
  return (
    <div className="boot">
      <div className="boot__inner">Carregando página…</div>
    </div>
  )
}
