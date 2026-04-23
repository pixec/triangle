import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useEffect, useRef, useState } from 'react'
import { loadLanguageExtension } from '../lib/codemirror-language'
import { currentUITheme, editorThemeExtension, type UITheme } from '../lib/codemirror-theme'

export function CodeMirrorEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  languageHint,
}: {
  value: string
  onChange?: (nextValue: string) => void
  readOnly?: boolean
  placeholder?: string
  languageHint?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const languageCompartmentRef = useRef(new Compartment())
  const themeCompartmentRef = useRef(new Compartment())
  const [theme, setTheme] = useState<UITheme>(() => currentUITheme())

  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          languageCompartmentRef.current.of([]),
          themeCompartmentRef.current.of(editorThemeExtension(theme)),
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (!update.docChanged || readOnly) {
              return
            }

            onChangeRef.current?.(update.state.doc.toString())
          }),
        ],
      }),
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [readOnly])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    const current = view.state.doc.toString()
    if (current === value) {
      return
    }

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    })
  }, [value])

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<UITheme>).detail
      if (detail === 'light' || detail === 'dark') {
        setTheme(detail)
      } else {
        setTheme(currentUITheme())
      }
    }

    window.addEventListener('triangle-theme-change', onThemeChange)
    return () => {
      window.removeEventListener('triangle-theme-change', onThemeChange)
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(editorThemeExtension(theme)),
    })
  }, [theme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    let cancelled = false

    const applyLanguage = async () => {
      const language = await loadLanguageExtension(languageHint)
      if (cancelled || !viewRef.current) {
        return
      }

      viewRef.current.dispatch({
        effects: languageCompartmentRef.current.reconfigure(language),
      })
    }

    applyLanguage()

    return () => {
      cancelled = true
    }
  }, [languageHint])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {placeholder && !value ? <p className="mb-2 text-xs text-neutral-500">{placeholder}</p> : null}
      <div className="flex min-h-0 flex-1 flex-col [&_.cm-editor]:flex-1 [&_.cm-editor]:h-full [&_.cm-scroller]:flex-1" ref={hostRef} />
    </div>
  )
}
