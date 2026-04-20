const CHANNEL_NAME = 'vyntask-dexie-sync-v1'

type SyncMessage = { v: 1; kind: 'incremental-pull' }

let channel: BroadcastChannel | null = null
let debounceTimer: number | null = null
let onIncremental: (() => void) | null = null

function scheduleIncremental(): void {
  if (!onIncremental) return
  if (debounceTimer != null) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    onIncremental?.()
  }, 450)
}

export function broadcastDexieSyncHint(): void {
  if (typeof BroadcastChannel === 'undefined' || typeof window === 'undefined') return
  try {
    const ch =
      channel ??
      (() => {
        channel = new BroadcastChannel(CHANNEL_NAME)
        return channel
      })()
    const msg: SyncMessage = { v: 1, kind: 'incremental-pull' }
    ch.postMessage(msg)
  } catch {
    // ignore
  }
}

export function startCrossTabDexieSync(handler: () => void): void {
  if (typeof BroadcastChannel === 'undefined' || typeof window === 'undefined') return
  stopCrossTabDexieSync()
  onIncremental = handler
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
      if (ev.data?.v === 1 && ev.data.kind === 'incremental-pull') scheduleIncremental()
    }
  } catch {
    channel = null
    onIncremental = null
  }
}

export function stopCrossTabDexieSync(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  onIncremental = null
  try {
    channel?.close()
  } catch {
    // ignore
  }
  channel = null
}
