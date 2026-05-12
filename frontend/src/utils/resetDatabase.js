export const APP_STORAGE_KEYS = [
  'auth',
  'users',
  'schools',
  'eligibilitySubmissions',
  'adminActivityLogs',
  'rememberEmail',
  'loginEmailHistory',
]

export function resetDatabase({ mode = 'reset' } = {}) {
  if (typeof window === 'undefined') return
  if (!window.localStorage) return

  if (mode === 'clearAll') {
    window.localStorage.clear()
    return
  }

  APP_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key)
  })
}

