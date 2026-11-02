import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyTeachingAuthorization,
  clearTeachingTokens,
  getTeachingTokens,
  setTeachingTokens,
} from '../teaching-auth'

describe('teaching auth storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearTeachingTokens()
  })

  it('stores token pairs for the current iframe session', () => {
    setTeachingTokens({ access_token: 'access', refresh_token: 'refresh' })

    expect(getTeachingTokens()).toEqual({ access_token: 'access', refresh_token: 'refresh' })
  })

  it('adds bearer authorization when a student session exists', () => {
    setTeachingTokens({ access_token: 'access', refresh_token: 'refresh' })
    const headers = new Headers()

    expect(applyTeachingAuthorization(headers)).toBe(true)
    expect(headers.get('Authorization')).toBe('Bearer access')
  })

  it('leaves administrator requests unchanged without student tokens', () => {
    const headers = new Headers()

    expect(applyTeachingAuthorization(headers)).toBe(false)
    expect(headers.has('Authorization')).toBe(false)
  })
})
