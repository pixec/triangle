const SENTINEL = 'tri:enc:v1:'

type EncryptedEnvelope = {
  v: 1
  salt: string
  iv: string
  ct: string
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

export async function encryptContent(plaintext: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))

  const envelope: EncryptedEnvelope = {
    v: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  }

  return SENTINEL + JSON.stringify(envelope)
}

export async function decryptContent(payload: string, passphrase: string): Promise<string> {
  if (!payload.startsWith(SENTINEL)) {
    throw new Error('Not an encrypted payload.')
  }

  const envelope: EncryptedEnvelope = JSON.parse(payload.slice(SENTINEL.length))
  const salt = fromBase64(envelope.salt)
  const iv = fromBase64(envelope.iv)
  const ct = fromBase64(envelope.ct)
  const key = await deriveKey(passphrase, salt)

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  } catch {
    throw new Error('Wrong passphrase or corrupted content.')
  }

  return new TextDecoder().decode(plaintext)
}

export function isEncrypted(content: string): boolean {
  return content.startsWith(SENTINEL)
}
