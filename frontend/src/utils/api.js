export const API_BASE_URL = ''

function getStoredAuth() {
  try {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function apiJson(path, { method = 'GET', body, headers } = {}) {
  const auth = getStoredAuth()
  const mergedHeaders = {
    ...(body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(auth?.email ? { 'x-auth-email': auth.email } : {}),
    ...(auth?.role ? { 'x-auth-role': auth.role } : {}),
    ...(auth?.schoolId != null ? { 'x-auth-school-id': String(auth.schoolId) } : {}),
    ...(auth?.schoolName ? { 'x-auth-school-name': auth.schoolName } : {}),
    ...(headers || {}),
  }

  const res = await fetch(path, {
    method,
    headers: mergedHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  })

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
    const message = data?.message || 'Permintaan gagal'
    throw new Error(message)
  }
  return data
}
