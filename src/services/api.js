const BASE_URL = 'http://localhost:3001'

async function request(path, options = {}) {
  const token = localStorage.getItem('livecode_token')

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)

  return data
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST', body }),
  put:    (path, body)  => request(path, { method: 'PUT', body }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}
