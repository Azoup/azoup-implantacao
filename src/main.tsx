import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './theme/palettes.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { UnsavedChangesProvider } from './navigation/UnsavedChangesContext'
import { ThemeProvider } from './theme/ThemeContext'
import { UiFeedbackProvider } from './ui/UiFeedbackContext'
import { isSupabaseConfigured } from './lib/supabaseClient'

if (import.meta.env.DEV) {
  console.info(
    '[VynTask]',
    isSupabaseConfigured()
      ? 'Supabase configurado (variáveis carregadas).'
      : 'Supabase: preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local',
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UiFeedbackProvider>
        <AuthProvider>
          <BrowserRouter>
            <UnsavedChangesProvider>
              <App />
            </UnsavedChangesProvider>
          </BrowserRouter>
        </AuthProvider>
      </UiFeedbackProvider>
    </ThemeProvider>
  </StrictMode>,
)
