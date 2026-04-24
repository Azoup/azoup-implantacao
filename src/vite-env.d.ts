/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DATA_MODE?: 'local' | 'cloud'
  /** Após rodar `supabase/sql/009_tasks_is_ad_hoc.sql`, use `1` para persistir `is_ad_hoc` no Postgres. */
  readonly VITE_SYNC_TASK_IS_AD_HOC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
