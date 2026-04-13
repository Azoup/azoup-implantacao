import { digitsOnly } from '../lib/brazilFormat'

export type ViaCepResult = {
  cepDigits: string
  addressStreet: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressComplement: string | null
}

type ViaCepJson = {
  erro?: boolean
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
}

/** @see https://viacep.com.br */
export async function fetchCepViaViaCep(rawCep: string): Promise<ViaCepResult> {
  const cepDigits = digitsOnly(rawCep).slice(0, 8)
  if (cepDigits.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos.')
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error('Não foi possível consultar o CEP.')

  const j = (await res.json()) as ViaCepJson
  if (j.erro) throw new Error('CEP não encontrado.')

  return {
    cepDigits,
    addressStreet: j.logradouro?.trim() || null,
    addressNeighborhood: j.bairro?.trim() || null,
    addressCity: j.localidade?.trim() || null,
    addressState: j.uf?.trim().toUpperCase().slice(0, 2) || null,
    addressComplement: j.complemento?.trim() || null,
  }
}
