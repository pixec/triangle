export type RuntimeConfig = {
  min_content_length: number
  max_content_length: number
}

const DEFAULT_CONFIG: RuntimeConfig = {
  min_content_length: 8,
  max_content_length: 1000,
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await fetch('/config')
  if (!response.ok) {
    return DEFAULT_CONFIG
  }

  const data = (await response.json()) as Partial<RuntimeConfig>
  const min = Number.isFinite(data.min_content_length) ? Number(data.min_content_length) : DEFAULT_CONFIG.min_content_length
  const max = Number.isFinite(data.max_content_length) ? Number(data.max_content_length) : DEFAULT_CONFIG.max_content_length

  return {
    min_content_length: min,
    max_content_length: max,
  }
}
