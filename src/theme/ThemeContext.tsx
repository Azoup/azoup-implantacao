import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isPaletteId, LEGACY_PALETTE_MAP, type PaletteId } from './paletteCatalog'

const THEME_KEY = 'implantacao_azoup_theme_v1'
const PALETTE_KEY = 'implantacao_azoup_palette_v1'
const THEME_SOURCE_KEY = 'implantacao_azoup_theme_source_v1'

export type ThemeMode = 'light' | 'dark'
export type ThemeSource = 'manual' | 'system'

type ThemeContextValue = {
  /** Modo efetivo aplicado ao `data-theme` (claro/escuro). */
  theme: ThemeMode
  /** Manual = respeita escolha guardada; System = segue `prefers-color-scheme`. */
  themeSource: ThemeSource
  setTheme: (t: ThemeMode) => void
  setThemeSource: (s: ThemeSource) => void
  toggle: () => void
  palette: PaletteId
  setPalette: (p: PaletteId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY) as ThemeMode | null
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return 'light'
}

function readThemeSource(): ThemeSource {
  try {
    const s = localStorage.getItem(THEME_SOURCE_KEY) as ThemeSource | null
    if (s === 'system' || s === 'manual') return s
  } catch {
    /* ignore */
  }
  return 'manual'
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const DEFAULT_PALETTE: PaletteId = 'neo'

function readPalette(): PaletteId {
  try {
    const p = localStorage.getItem(PALETTE_KEY)
    if (p && isPaletteId(p)) return p
    if (p && LEGACY_PALETTE_MAP[p]) {
      const next = LEGACY_PALETTE_MAP[p]
      try {
        localStorage.setItem(PALETTE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSource, setThemeSourceState] = useState<ThemeSource>(() => readThemeSource())
  const [manualTheme, setManualThemeState] = useState<ThemeMode>(() => readTheme())
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => getSystemTheme())
  const [palette, setPaletteState] = useState<PaletteId>(() => readPalette())

  const themeSourceRef = useRef(themeSource)
  themeSourceRef.current = themeSource

  const theme: ThemeMode = themeSource === 'system' ? systemTheme : manualTheme

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.palette = palette
  }, [theme, palette])

  useEffect(() => {
    if (themeSource !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeSource])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, manualTheme)
    } catch {
      /* ignore */
    }
  }, [manualTheme])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_SOURCE_KEY, themeSource)
    } catch {
      /* ignore */
    }
  }, [themeSource])

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_KEY, palette)
    } catch {
      /* ignore */
    }
  }, [palette])

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeSourceState('manual')
    setManualThemeState(t)
  }, [])

  const setThemeSource = useCallback((s: ThemeSource) => {
    if (s === 'system') {
      setThemeSourceState('system')
      setSystemTheme(getSystemTheme())
      return
    }
    if (themeSourceRef.current === 'system') {
      setManualThemeState(getSystemTheme())
    }
    setThemeSourceState('manual')
  }, [])

  const toggle = useCallback(() => {
    const eff = themeSource === 'system' ? getSystemTheme() : manualTheme
    const next: ThemeMode = eff === 'dark' ? 'light' : 'dark'
    setThemeSourceState('manual')
    setManualThemeState(next)
  }, [themeSource, manualTheme])

  const setPalette = useCallback((p: PaletteId) => setPaletteState(p), [])

  const value = useMemo(
    () => ({ theme, themeSource, setTheme, setThemeSource, toggle, palette, setPalette }),
    [theme, themeSource, setTheme, setThemeSource, toggle, palette, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme fora de ThemeProvider')
  return ctx
}
