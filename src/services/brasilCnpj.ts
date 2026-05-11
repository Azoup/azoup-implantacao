import { digitsOnly } from '../lib/brazilFormat'

export type CnpjLookupResult = {
  cnpjDigits: string
  razaoSocial: string
  tradeName: string | null
  cepDigits: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
}

type BrasilApiCnpjJson = {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  message?: string
}

type ReceitaWsCnpjJson = {
  status?: string
  nome?: string
  fantasia?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  message?: string
}

/**
 * Mesma origem que a SPA: em dev o Vite proxia `/api/brasilapi` e `/api/receitaws`;
 * na Vercel, `vercel.json` reescreve esses prefixos para os hosts externos (evita CORS no browser).
 */
function fetchCnpjJson(endpoint: string): Promise<Response> {
  return fetch(endpoint, { headers: { Accept: 'application/json' } })
}

async function fetchFromBrasilApi(cnpjDigits: string): Promise<CnpjLookupResult> {
  const endpoint = `/api/brasilapi/api/cnpj/v1/${cnpjDigits}`

  const res = await fetchCnpjJson(endpoint)
  if (res.status === 429) {
    throw new Error('BRASILAPI_RATE_LIMIT')
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('CNPJ não encontrado na base consultada.')
    throw new Error('Falha ao consultar CNPJ na BrasilAPI.')
  }

  const j = (await res.json()) as BrasilApiCnpjJson
  if (j.message && !j.razao_social) throw new Error(j.message)
  const cepDigits = j.cep ? digitsOnly(j.cep).slice(0, 8) : null

  return {
    cnpjDigits,
    razaoSocial: (j.razao_social ?? '').trim() || '—',
    tradeName: j.nome_fantasia?.trim() || null,
    cepDigits: cepDigits && cepDigits.length === 8 ? cepDigits : null,
    addressStreet: j.logradouro?.trim() || null,
    addressNumber: j.numero?.trim() || null,
    addressComplement: j.complemento?.trim() || null,
    addressNeighborhood: j.bairro?.trim() || null,
    addressCity: j.municipio?.trim() || null,
    addressState: j.uf?.trim().toUpperCase().slice(0, 2) || null,
  }
}

async function fetchFromReceitaWs(cnpjDigits: string): Promise<CnpjLookupResult> {
  const endpoint = `/api/receitaws/v1/cnpj/${cnpjDigits}`

  const res = await fetchCnpjJson(endpoint)
  if (!res.ok) {
    if (res.status === 404) throw new Error('CNPJ não encontrado na base consultada.')
    throw new Error('Falha ao consultar CNPJ na ReceitaWS.')
  }

  const j = (await res.json()) as ReceitaWsCnpjJson
  if (j.status?.toUpperCase() === 'ERROR') {
    throw new Error(j.message || 'Falha ao consultar CNPJ na ReceitaWS.')
  }

  const cepDigits = j.cep ? digitsOnly(j.cep).slice(0, 8) : null
  return {
    cnpjDigits,
    razaoSocial: (j.nome ?? '').trim() || '—',
    tradeName: j.fantasia?.trim() || null,
    cepDigits: cepDigits && cepDigits.length === 8 ? cepDigits : null,
    addressStreet: j.logradouro?.trim() || null,
    addressNumber: j.numero?.trim() || null,
    addressComplement: j.complemento?.trim() || null,
    addressNeighborhood: j.bairro?.trim() || null,
    addressCity: j.municipio?.trim() || null,
    addressState: j.uf?.trim().toUpperCase().slice(0, 2) || null,
  }
}

/**
 * Dados cadastrais públicos agregados (fonte Brasil API — não é certidão da Receita).
 * @see https://brasilapi.com.br/docs#tag/CNPJ
 */
export async function fetchCnpjFromBrasilApi(rawCnpj: string): Promise<CnpjLookupResult> {
  const cnpjDigits = digitsOnly(rawCnpj)
  if (cnpjDigits.length !== 14) {
    throw new Error('Informe um CNPJ com 14 dígitos.')
  }

  try {
    return await fetchFromBrasilApi(cnpjDigits)
  } catch {
    // no-op: controle final abaixo
  }

  try {
    return await fetchFromReceitaWs(cnpjDigits)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('CNPJ não encontrado')) {
      throw new Error(msg)
    }
    if (msg.includes('429') || msg.includes('rate') || msg.includes('limite')) {
      throw new Error('Limite temporário da consulta de CNPJ atingido. Aguarde alguns instantes e tente novamente.')
    }
    throw new Error('Falha ao consultar CNPJ (BrasilAPI e fallback). Verifique a internet e tente novamente.')
  }
}
