import { AZOUP_WELCOME_FORM_FIELDS, AZOUP_WELCOME_GOOGLE_FORM_URL } from '../constants/azoupWelcomeForm'

/** Alinhado ao portal (`PortalWelcomeFormPage`) e ao JSON em `welcome_form_templates.form_schema`. */
export type WelcomeFormFieldDef = {
  id: string
  section?: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checklist'
  required?: boolean
  options?: string[]
  help?: string
  placeholder?: string
}

export type WelcomeFormSchemaPayload = {
  /** Quando `fields` tem itens, eles mandam no portal. `version: 'azoup'` + `fields: []` usa o catálogo do app. */
  version?: string
  externalGoogleFormUrl?: string | null
  fields: WelcomeFormFieldDef[]
}

export function resolveWelcomeFormFieldsFromSchema(schema: unknown): WelcomeFormFieldDef[] {
  const s = schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : null
  const fields = s?.fields
  if (Array.isArray(fields) && fields.length > 0) {
    return (fields as WelcomeFormFieldDef[]).map((f) => ({ ...f }))
  }
  if (s?.version === 'azoup') {
    return AZOUP_WELCOME_FORM_FIELDS.map((f) => ({ ...f }))
  }
  return AZOUP_WELCOME_FORM_FIELDS.map((f) => ({ ...f }))
}

export function defaultGoogleFormUrlFromSchema(schema: unknown): string | null {
  const s = schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : null
  const u = s?.externalGoogleFormUrl
  return typeof u === 'string' && u.trim().length > 0 ? u.trim() : null
}

export function buildAzoupMarkerSchema(): WelcomeFormSchemaPayload {
  return {
    version: 'azoup',
    fields: [],
    externalGoogleFormUrl: AZOUP_WELCOME_GOOGLE_FORM_URL,
  }
}
