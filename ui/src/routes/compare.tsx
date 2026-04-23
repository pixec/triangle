import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Check, Copy, KeyRound, LoaderCircle, Search, Unlock } from 'lucide-react'
import { useState } from 'react'
import { CodeMirrorEditor } from '../components/CodeMirrorEditor'
import { MergeDiffViewer } from '../components/MergeDiffViewer'
import { Navbar } from '../components/Navbar'
import { decryptPaste, fetchPaste } from '../lib/paste-api'

function useDecryptedContent(id: string, encrypted: boolean) {
  const [passphrase, setPassphrase] = useState('')
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [decrypting, setDecrypting] = useState(false)

  async function decrypt() {
    setError('')
    setDecrypting(true)
    try {
      setContent(await decryptPaste(id, passphrase))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed.')
    } finally {
      setDecrypting(false)
    }
  }

  return { passphrase, setPassphrase, content, error, decrypting, decrypt, needsDecrypt: encrypted && content === null }
}

function normalizeForCompare(content: string) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/g, '')
}

export function ComparePage() {
  const [leftInput, setLeftInput] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('left') ?? '',
  )
  const [rightInput, setRightInput] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('right') ?? '',
  )

  const [leftId, setLeftId] = useState(leftInput)
  const [rightId, setRightId] = useState(rightInput)
  const [copiedKey, setCopiedKey] = useState('')

  const updateUrl = (nextLeft: string, nextRight: string) => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    if (nextLeft) {
      url.searchParams.set('left', nextLeft)
    } else {
      url.searchParams.delete('left')
    }

    if (nextRight) {
      url.searchParams.set('right', nextRight)
    } else {
      url.searchParams.delete('right')
    }

    window.history.replaceState(null, '', url.toString())
  }

  const leftQuery = useQuery({
    queryKey: ['paste', 'left', leftId],
    queryFn: () => fetchPaste(leftId),
    enabled: Boolean(leftId),
  })

  const rightQuery = useQuery({
    queryKey: ['paste', 'right', rightId],
    queryFn: () => fetchPaste(rightId),
    enabled: Boolean(rightId),
  })

  const leftDecrypt = useDecryptedContent(leftId, leftQuery.data?.encrypted ?? false)
  const rightDecrypt = useDecryptedContent(rightId, rightQuery.data?.encrypted ?? false)

  const leftContent = leftQuery.data?.encrypted ? leftDecrypt.content : (leftQuery.data?.content ?? null)
  const rightContent = rightQuery.data?.encrypted ? rightDecrypt.content : (rightQuery.data?.content ?? null)

  const bothLoaded = leftQuery.data && rightQuery.data
  const bothReady = leftContent !== null && rightContent !== null
  const noChangedLines = bothReady && normalizeForCompare(leftContent) === normalizeForCompare(rightContent)

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

  return (
    <div className="ui-page-enter flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <Navbar page="compare" />

      <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-5 py-3">
        <input
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-sm outline-none focus:border-neutral-400 focus:bg-white"
          onChange={(event) => setLeftInput(event.target.value)}
          placeholder="Left paste id"
          value={leftInput}
        />
        <ArrowLeftRight className="h-4 w-4 shrink-0 text-neutral-400" />
        <input
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-sm outline-none focus:border-neutral-400 focus:bg-white"
          onChange={(event) => setRightInput(event.target.value)}
          placeholder="Right paste id"
          value={rightInput}
        />
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm font-medium transition hover:bg-neutral-100"
          onClick={() => {
            const nextLeft = leftInput.trim()
            const nextRight = rightInput.trim()
            setLeftId(nextLeft)
            setRightId(nextRight)
            updateUrl(nextLeft, nextRight)
          }}
          type="button"
        >
          <Search className="h-3.5 w-3.5" />
          Compare
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
            onClick={() => copyText('left-id', leftInput.trim())}
            type="button"
          >
            {copiedKey === 'left-id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Left ID
          </button>
          <button
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
            onClick={() => copyText('right-id', rightInput.trim())}
            type="button"
          >
            {copiedKey === 'right-id' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Right ID
          </button>
        </div>

        {leftQuery.isFetching || rightQuery.isFetching ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
        ) : null}

        {leftQuery.error ? (
          <p className="shrink-0 text-sm text-red-700">Left: {leftQuery.error.message}</p>
        ) : null}
        {rightQuery.error ? (
          <p className="shrink-0 text-sm text-red-700">Right: {rightQuery.error.message}</p>
        ) : null}
      </div>

      {bothLoaded && !bothReady ? (
        <div className="flex min-h-0 flex-1 divide-x divide-neutral-200">
          {[
            { label: 'Left', query: leftQuery, dec: leftDecrypt },
            { label: 'Right', query: rightQuery, dec: rightDecrypt },
          ].map(({ label, query, dec }) => (
            <div className="flex flex-1 items-center justify-center" key={label}>
              {query.data?.encrypted && dec.needsDecrypt ? (
                <div className="w-full max-w-xs space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-md">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-semibold">{label} paste is encrypted</p>
                  </div>
                  <input
                    autoFocus={label === 'Left'}
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 focus:bg-white"
                    onChange={(e) => { dec.setPassphrase(e.target.value) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') dec.decrypt() }}
                    placeholder="Passphrase"
                    type="password"
                    value={dec.passphrase}
                  />
                  {dec.error ? <p className="text-sm text-red-700">{dec.error}</p> : null}
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:bg-neutral-400"
                    disabled={!dec.passphrase || dec.decrypting}
                    onClick={dec.decrypt}
                    type="button"
                  >
                    {dec.decrypting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                    Decrypt
                  </button>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">{label} paste loaded.</p>
              )}
            </div>
          ))}
        </div>
      ) : bothReady ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-end gap-2 border-b border-neutral-200 bg-white px-5 py-2">
            <button
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
              onClick={() => copyText('left-content', leftContent!)}
              type="button"
            >
              {copiedKey === 'left-content' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Left content
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
              onClick={() => copyText('right-content', rightContent!)}
              type="button"
            >
              {copiedKey === 'right-content' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Right content
            </button>
          </div>
          <div className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {noChangedLines ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-neutral-200 bg-white px-5 py-2 text-sm text-neutral-600">(No changed lines)</div>
              <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-neutral-200">
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <p className="mb-2 text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase">Left</p>
                  <div className="flex min-h-0 flex-1 flex-col [&_.cm-editor]:flex-1 [&_.cm-editor]:h-full [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col">
                    <CodeMirrorEditor readOnly value={leftContent!} languageHint={leftQuery.data?.title} />
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <p className="mb-2 text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase">Right</p>
                  <div className="flex min-h-0 flex-1 flex-col [&_.cm-editor]:flex-1 [&_.cm-editor]:h-full [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col">
                    <CodeMirrorEditor readOnly value={rightContent!} languageHint={rightQuery.data?.title} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <MergeDiffViewer
              left={leftContent!}
              right={rightContent!}
              leftLanguageHint={leftQuery.data?.title}
              rightLanguageHint={rightQuery.data?.title}
            />
          )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-neutral-400">Enter two paste ids above and press Compare.</p>
        </div>
      )}
    </div>
  )
}

export default ComparePage
