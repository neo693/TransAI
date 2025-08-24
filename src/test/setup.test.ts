import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('should have Chrome API mocked', () => {
    expect(chrome).toBeDefined()
    expect(chrome.runtime).toBeDefined()
    expect(chrome.storage).toBeDefined()
  })

  it('should be able to run basic tests', () => {
    expect(1 + 1).toBe(2)
  })
})