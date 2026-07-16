export type TeachingTokenPair = {
  access_token: string
  refresh_token: string
  csrf_token?: string
}

const STORAGE_KEY = 'dify_teaching_auth'
let memoryTokens: TeachingTokenPair | null = null

const getSessionStorage = (): Storage | null => {
  if (typeof globalThis.window === 'undefined')
    return null
  try {
    return globalThis.sessionStorage
  }
  catch {
    // Some iframe privacy modes deny Web Storage. The in-memory fallback still
    // keeps the current page usable without falling back to third-party cookies.
    return null
  }
}

export const getTeachingTokens = (): TeachingTokenPair | null => {
  const storage = getSessionStorage()
  if (!storage)
    return memoryTokens
  try {
    const value = storage.getItem(STORAGE_KEY)
    if (!value)
      return memoryTokens
    const tokens = JSON.parse(value) as TeachingTokenPair
    if (!tokens.access_token || !tokens.refresh_token)
      return null
    memoryTokens = tokens
    return tokens
  }
  catch {
    return memoryTokens
  }
}

export const setTeachingTokens = (tokens: TeachingTokenPair): void => {
  memoryTokens = tokens
  try {
    getSessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }
  catch {
    // The memory copy is intentional when iframe storage is unavailable.
  }
}

export const clearTeachingTokens = (): void => {
  memoryTokens = null
  try {
    getSessionStorage()?.removeItem(STORAGE_KEY)
  }
  catch {}
}

export const getTeachingAccessToken = (): string => getTeachingTokens()?.access_token || ''
export const getTeachingRefreshToken = (): string => getTeachingTokens()?.refresh_token || ''

/** Add student Bearer auth and report whether cookie credentials must be omitted. */
export const applyTeachingAuthorization = (headers: Headers): boolean => {
  const accessToken = getTeachingAccessToken()
  if (!accessToken)
    return false
  headers.set('Authorization', `Bearer ${accessToken}`)
  return true
}
