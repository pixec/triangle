import { ArrowLeftRight, Moon, Plus, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function Navbar({ page }: { page: 'home' | 'compare' }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') {
      return 'light'
    }

    const existing = document.documentElement.getAttribute('data-theme')
    if (existing === 'dark' || existing === 'light') {
      return existing
    }

    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('triangle-theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    window.dispatchEvent(new CustomEvent('triangle-theme-change', { detail: nextTheme }))
  }

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
      <a className="flex items-center gap-2" href="/">
        <span className="text-xs font-semibold tracking-[0.3em] text-neutral-800 uppercase select-none">Triangle</span>
      </a>

      <nav className="flex items-center gap-1">
        <button
          aria-label="Toggle dark mode"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          onClick={toggleTheme}
          type="button"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <a
          aria-current={page === 'home' ? 'page' : undefined}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition aria-[current=page]:bg-neutral-100 aria-[current=page]:text-neutral-900 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          href="/"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </a>
        <a
          aria-current={page === 'compare' ? 'page' : undefined}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition aria-[current=page]:bg-neutral-100 aria-[current=page]:text-neutral-900 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          href="/compare"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Compare
        </a>
      </nav>
    </header>
  )
}
