import { describe, expect, it } from 'vitest'
import { manualMatchesQuery, normalizeManualSearch } from './manualsSearch'
import type { ManualDef } from '../constants/manualsCatalog'

const sample: ManualDef = {
  id: 'x',
  title: 'Integração WooCommerce',
  audience: 'internal',
  category: 'integracoes',
  description: 'REST API e chaves',
  keywords: ['wordpress'],
}

describe('manualsSearch', () => {
  it('normalizes accents', () => {
    expect(normalizeManualSearch('  WooCommerce  ')).toBe('woocommerce')
    expect(normalizeManualSearch('ação')).toBe('acao')
  })

  it('matches title and keywords', () => {
    expect(manualMatchesQuery(sample, 'woo')).toBe(true)
    expect(manualMatchesQuery(sample, 'wordpress')).toBe(true)
    expect(manualMatchesQuery(sample, 'rest')).toBe(true)
    expect(manualMatchesQuery(sample, 'inexistente-xyz')).toBe(false)
  })

  it('empty query matches all', () => {
    expect(manualMatchesQuery(sample, '')).toBe(true)
    expect(manualMatchesQuery(sample, '   ')).toBe(true)
  })
})
