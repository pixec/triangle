import { PastePage } from './routes/index'
import { ComparePage } from './routes/compare'
import { ViewPage } from './routes/view'

export function App() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname
  const search = typeof window === 'undefined' ? '' : window.location.search
  const pasteId = new URLSearchParams(search).get('paste')

  if (pathname === '/compare') {
    return <ComparePage />
  }

  if (pasteId) {
    return <ViewPage id={pasteId} />
  }

  return <PastePage />
}

export default App
