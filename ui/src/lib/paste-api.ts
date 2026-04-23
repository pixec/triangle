export type Paste = {
  id: string
  title: string
  content: string
  encrypted: boolean
  created_at: string
  expires_at?: string
}

export async function createPaste(title: string, content: string, passphrase?: string, expiresIn?: string): Promise<Paste> {
  const response = await fetch('/api/paste/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title,
      content,
      passphrase: passphrase || undefined,
      expires_in: expiresIn || undefined,
    }),
  })

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Paste content must be between 8 and 1000 characters.')
    }

    throw new Error('Could not create paste. Please try again.')
  }

  return response.json()
}

export async function fetchPaste(id: string): Promise<Paste> {
  const response = await fetch(`/api/paste/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Paste not found.')
    }

    throw new Error('Could not load paste.')
  }

  return response.json()
}

export async function decryptPaste(id: string, passphrase: string): Promise<string> {
  const response = await fetch(`/api/paste/${id}/decrypt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('Wrong passphrase.')
    if (response.status === 404) throw new Error('Paste not found.')
    throw new Error('Could not decrypt paste.')
  }

  const data: { content: string } = await response.json()
  return data.content
}
