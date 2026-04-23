import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

export type UITheme = 'light' | 'dark'

export function currentUITheme(): UITheme {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function editorThemeExtension(theme: UITheme): Extension {
  const base = EditorView.theme(
    {
      '&': {
        height: '100%',
        borderRadius: '0.5rem',
        border: theme === 'dark' ? '1px solid rgb(42 54 68)' : '1px solid rgb(212 212 212)',
        backgroundColor: theme === 'dark' ? 'rgb(15 23 32)' : 'rgb(255 255 255)',
      },
      '.cm-content': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.9rem',
      },
      '.cm-scroller': {
        padding: '0.75rem',
      },
      '&.cm-focused': {
        outline: theme === 'dark' ? '2px solid rgb(92 123 153 / 0.5)' : '2px solid rgb(115 115 115 / 0.35)',
      },
    },
    { dark: theme === 'dark' },
  )

  return theme === 'dark' ? [oneDark, base] : [base]
}
