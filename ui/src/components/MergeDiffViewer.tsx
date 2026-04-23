import { basicSetup } from 'codemirror'
import { MergeView } from '@codemirror/merge'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState } from 'react'
import { loadLanguageExtension } from '../lib/codemirror-language'
import { currentUITheme, editorThemeExtension, type UITheme } from '../lib/codemirror-theme'

export function MergeDiffViewer({
  left,
  right,
  leftLanguageHint,
  rightLanguageHint,
}: {
  left: string
  right: string
  leftLanguageHint?: string
  rightLanguageHint?: string
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mergeRef = useRef<MergeView | null>(null)
  const [theme, setTheme] = useState<UITheme>(() => currentUITheme())

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
    if (!hostRef.current) {
      return
    }

    let cancelled = false

    const setupMerge = async () => {
      const [leftLanguage, rightLanguage] = await Promise.all([
        loadLanguageExtension(leftLanguageHint),
        loadLanguageExtension(rightLanguageHint),
      ])
      if (cancelled || !hostRef.current) {
        return
      }

      const merge = new MergeView({
        a: {
          doc: left,
          extensions: [
            basicSetup,
            leftLanguage,
            editorThemeExtension(theme),
            EditorView.editable.of(false),
            EditorView.theme({
              '&': { height: '100%' },
              '.cm-content': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.88rem',
              },
            }),
          ],
        },
        b: {
          doc: right,
          extensions: [
            basicSetup,
            rightLanguage,
            editorThemeExtension(theme),
            EditorView.editable.of(false),
            EditorView.theme({
              '&': { height: '100%' },
              '.cm-content': {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.88rem',
              },
            }),
          ],
        },
        parent: hostRef.current,
        gutter: true,
        highlightChanges: true,
        orientation: 'a-b',
      })

      mergeRef.current = merge
    }

    setupMerge()

    return () => {
      cancelled = true
      mergeRef.current?.destroy()
      mergeRef.current = null
    }
  }, [left, right, leftLanguageHint, rightLanguageHint, theme])

  return <div className="triangle-merge" ref={hostRef} />
}

export default MergeDiffViewer
