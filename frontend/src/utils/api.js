export const API_BASE_URL = ''
const AUTH_STORAGE_KEY = 'auth'
const AUTH_CHANGED_EVENT = 'auth:changed'

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function setStoredAuth(auth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function getAuthHeaders(headers = {}) {
  const auth = getStoredAuth()
  return {
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(headers || {}),
  }
}

async function parseResponse(res) {
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim()
      throw new Error(`Respons server bukan JSON. ${snippet || 'Tidak ada detail.'}`)
    }
  }

  if (!res.ok) {
    if (res.status === 401) clearStoredAuth()
    const message = data?.message || 'Permintaan gagal'
    throw new Error(message)
  }

  return data
}

export async function apiJson(path, { method = 'GET', body, headers } = {}) {
  const mergedHeaders = {
    ...(body != null ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(headers),
  }

  const res = await fetch(path, {
    method,
    headers: mergedHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  return parseResponse(res)
}

export async function apiForm(path, { method = 'POST', body, headers } = {}) {
  const res = await fetch(path, {
    method,
    headers: getAuthHeaders(headers),
    body,
  })

  return parseResponse(res)
}
