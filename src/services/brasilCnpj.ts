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

/**
 * Dados cadastrais públicos agregados (fonte Brasil API — não é certidão da Receita).
 * @see https://brasilapi.com.br/docs#tag/CNPJ
 */
export async function fetchCnpjFromBrasilApi(rawCnpj: string): Promise<CnpjLookupResult> {
  const cnpjDigits = digitsOnly(rawCnpj)
  if (cnpjDigits.length !== 14) {
    throw new Error('Informe um CNPJ com 14 dígitos.')
  }

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    if (res.status === 404) throw new Error('CNPJ não encontrado na base consultada.')
    throw new Error('Falha ao consultar CNPJ. Tente de novo em instantes.')
  }

  const j = (await res.json()) as BrasilApiCnpjJson
  if (j.message && !j.razao_social) {
    throw new Error(j.message)
  }

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
