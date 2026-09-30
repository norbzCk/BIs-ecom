const API_BASE = '/api'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

/**
 * Multipart upload helper. The browser has to set the Content-Type itself so the
 * boundary is included, so this deliberately omits the JSON header.
 */
export async function apiUpload<T>(
  path: string,
  files: File[],
  token?: string | null,
  field = 'files',
): Promise<T> {
  const form = new FormData()
  files.forEach((file) => form.append(field, file))

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(', ')
          : String((payload as { message: unknown }).message)
        : null) ?? `Upload failed with status ${res.status}`

    throw new ApiError(message, res.status, payload)
  }

  return payload as T
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(', ')
          : String((payload as { message: unknown }).message)
        : null) ?? `Request failed with status ${res.status}`

    throw new ApiError(message, res.status, payload)
  }

  return payload as T
}
