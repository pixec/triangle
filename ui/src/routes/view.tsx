import { useQuery } from '@tanstack/react-query'
import { Check, Copy, KeyRound, LoaderCircle, Unlock } from 'lucide-react'
import { useState } from 'react'
import { CodeMirrorEditor } from '../components/CodeMirrorEditor'
import { Navbar } from '../components/Navbar'
import { fetchPaste, decryptPaste } from '../lib/paste-api'

export function ViewPage({ id }: { id: string }) {
  const pasteQuery = useQuery({
    queryKey: ['paste', id],
    queryFn: () => fetchPaste(id),
  })

  const [passphrase, setPassphrase] = useState('')
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  const encrypted = pasteQuery.data?.encrypted ?? false
  const displayContent = encrypted ? (decrypted ?? '') : (pasteQuery.data?.content ?? '')

  async function copyText(key: string, value: string) {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((prev) => (prev === key ? '' : prev)), 1200)
    } catch {
      setCopiedKey('')
    }
  }

  async function handleUnlock() {
    setDecryptError('')
    setDecrypting(true)
    try {
      setDecrypted(await decryptPaste(id, passphrase))
    } catch (e) {
      setDecryptError(e instanceof Error ? e.message : 'Decryption failed.')
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <div className="ui-page-enter flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <Navbar page="home" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
          {pasteQuery.data ? (
            <>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{pasteQuery.data.title || pasteQuery.data.id}</p>
                <p className="text-xs text-neutral-400">
                  {pasteQuery.data.id} · {new Date(pasteQuery.data.created_at).toLocaleString()}
                  {pasteQuery.data.expires_at ? ` · expires ${new Date(pasteQuery.data.expires_at).toLocaleString()}` : ''}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                  onClick={() => copyText('id', pasteQuery.data.id)}
                  type="button"
                >
                  {copiedKey === 'id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  ID
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={encrypted && !decrypted}
                  onClick={() => copyText('content', displayContent)}
                  type="button"
                >
                  {copiedKey === 'content' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Content
                </button>
                {encrypted && !decrypted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    <KeyRound className="h-3 w-3" /> Encrypted
                  </span>
                ) : encrypted && decrypted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    <Unlock className="h-3 w-3" /> Decrypted
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-400">{id}</p>
          )}
        </div>

        {pasteQuery.isFetching ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="inline-flex items-center gap-2 text-sm text-neutral-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading...
            </p>
          </div>
        ) : pasteQuery.error ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-red-700">{pasteQuery.error.message}</p>
          </div>
        ) : encrypted && !decrypted ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" />
                <h2 className="text-sm font-semibold">This paste is encrypted</h2>
              </div>
              <p className="text-sm text-neutral-500">Enter the passphrase to decrypt and view the content.</p>
              <input
                autoFocus
                className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-500 focus:bg-white"
                onChange={(e) => { setPassphrase(e.target.value); setDecryptError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
                placeholder="Passphrase"
                type="password"
                value={passphrase}
              />
              {decryptError ? <p className="text-sm text-red-700">{decryptError}</p> : null}
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
                disabled={!passphrase || decrypting}
                onClick={handleUnlock}
                type="button"
              >
                {decrypting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                Decrypt
              </button>
            </div>
          </div>
        ) : pasteQuery.data ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="flex min-h-0 flex-1 flex-col [&_.cm-editor]:flex-1 [&_.cm-editor]:h-full [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col">
              <CodeMirrorEditor readOnly value={displayContent} languageHint={pasteQuery.data.title} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ViewPage
