import type { Extension } from '@codemirror/state'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'

export async function loadLanguageExtension(languageHint?: string): Promise<Extension> {
  const hint = languageHint?.trim()
  if (!hint) {
    return []
  }

  const matched = LanguageDescription.matchFilename(languages, hint)
  if (!matched) {
    return []
  }

  try {
    return await matched.load()
  } catch {
    return []
  }
}
