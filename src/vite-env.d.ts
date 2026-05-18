/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DATA_MODE?: 'local' | 'cloud'
  /** Após rodar `supabase/sql/009_tasks_is_ad_hoc.sql`, use `1` para persistir `is_ad_hoc` no Postgres. */
  readonly VITE_SYNC_TASK_IS_AD_HOC?: string
  /** Após rodar `supabase/sql/018_tasks_no_show_fields.sql`, use `1` para persistir campos de no-show/reagendamento. */
  readonly VITE_SYNC_TASK_NO_SHOW_FIELDS?: string
  /** Após rodar `supabase/sql/016_projects_manual_checkin.sql`, use `1` para enviar check-in manual ao Postgres. */
  readonly VITE_SYNC_PROJECT_MANUAL_CHECKIN?: string
  /** Ativa a etapa opcional de reescrita via LLM no assistente IA (`/functions/v1/ai-project-assistant`). */
  readonly VITE_AI_ASSISTANT_ENABLE_LLM?: string
  /** `false` desliga Google Calendar; omitido ou `true` = ativo se Supabase estiver configurado. */
  readonly VITE_GOOGLE_CALENDAR_SYNC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
