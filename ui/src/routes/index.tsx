import { useMutation, useQuery } from '@tanstack/react-query'
import { Clock, KeyRound, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { CodeMirrorEditor } from '../components/CodeMirrorEditor'
import { Navbar } from '../components/Navbar'
import { createPaste } from '../lib/paste-api'
import { fetchRuntimeConfig } from '../lib/runtime-config'

const EXPIRY_OPTIONS = [
  { label: 'Never', value: '' },
  { label: '10 minutes', value: '10m' },
  { label: '1 hour', value: '1h' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '168h' },
  { label: '30 days', value: '720h' },
]

export function PastePage() {
  const [title, setTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [expiresIn, setExpiresIn] = useState('')

  const configQuery = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
  })

  const minContentLength = configQuery.data?.min_content_length ?? 8
  const maxContentLength = configQuery.data?.max_content_length ?? 1000

  const createMutation = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      createPaste(title, content, passphrase || undefined, expiresIn || undefined),
    onSuccess: (paste) => {
      window.location.href = `/?paste=${paste.id}`
    },
  })

  const canSubmit = draft.length >= minContentLength && draft.length <= maxContentLength

  return (
    <div className="ui-page-enter flex h-screen flex-col bg-neutral-50 text-neutral-900">
      <Navbar page="home" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-sm font-semibold">New paste</h1>
            <input
              className="w-72 max-w-[50vw] rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-sm outline-none focus:border-neutral-400 focus:bg-white"
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              value={title}
            />
          </div>
          <span className="text-xs text-neutral-500">{draft.length} / {maxContentLength}</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <div className="flex min-h-0 flex-1 flex-col [&_.cm-editor]:flex-1 [&_.cm-editor]:h-full [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col">
            <CodeMirrorEditor
              value={draft}
              onChange={setDraft}
              placeholder="Drop your snippet, stack trace, or notes here..."
              languageHint={title}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 bg-white px-5 py-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate({ title: title.trim(), content: draft })}
            type="button"
          >
            {createMutation.isPending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create paste
          </button>

          <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1">
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <input
              className="w-44 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase (optional)"
              type="password"
              value={passphrase}
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <select
              className="bg-transparent text-sm outline-none text-neutral-700"
              onChange={(e) => setExpiresIn(e.target.value)}
              value={expiresIn}
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {passphrase ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <KeyRound className="h-3 w-3" /> Encrypted
            </span>
          ) : null}

          {createMutation.error ? (
            <p className="text-sm text-red-700">{createMutation.error.message}</p>
          ) : null}
          {!createMutation.error ? (
            <p className="text-xs text-neutral-500">Allowed length: {minContentLength}-{maxContentLength} characters.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PastePage
