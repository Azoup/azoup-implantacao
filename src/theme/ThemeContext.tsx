import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isPaletteId, LEGACY_PALETTE_MAP, type PaletteId } from './paletteCatalog'

const THEME_KEY = 'vyntask_theme_v1'
const PALETTE_KEY = 'vyntask_palette_v1'

export type ThemeMode = 'light' | 'dark'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
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

const DEFAULT_PALETTE: PaletteId = 'black_orange'

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
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())
  const [palette, setPaletteState] = useState<PaletteId>(() => readPalette())

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.palette = palette
  }, [theme, palette])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_KEY, palette)
    } catch {
      /* ignore */
    }
  }, [palette])

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState((x) => (x === 'dark' ? 'light' : 'dark')), [])
  const setPalette = useCallback((p: PaletteId) => setPaletteState(p), [])

  const value = useMemo(
    () => ({ theme, setTheme, toggle, palette, setPalette }),
    [theme, setTheme, toggle, palette, setPalette],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme fora de ThemeProvider')
  return ctx
}
