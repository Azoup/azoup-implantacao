import { describe, expect, it } from 'vitest'
import { normalizeProjectClientType, projectClientTypeLabelPt, projectClientTypeSearchBlob } from './projectClientType'

describe('projectClientType', () => {
  it('normalizes unknown to generico', () => {
    expect(normalizeProjectClientType(undefined)).toBe('generico')
    expect(normalizeProjectClientType('')).toBe('generico')
    expect(normalizeProjectClientType('other')).toBe('generico')
  })

  it('normalizes confeccao', () => {
    expect(normalizeProjectClientType('confeccao')).toBe('confeccao')
    expect(normalizeProjectClientType('CONFECCAO')).toBe('confeccao')
  })

  it('labels PT uppercase', () => {
    expect(projectClientTypeLabelPt('confeccao')).toBe('CONFECÇÃO')
    expect(projectClientTypeLabelPt('generico')).toBe('GENÉRICO')
  })

  it('search blob includes synonyms', () => {
    const b = projectClientTypeSearchBlob({ clientType: 'confeccao' })
    expect(b).toContain('confecção')
    expect(b).toContain('confeccao')
  })
})
