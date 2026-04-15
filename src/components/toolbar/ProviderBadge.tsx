import { useEffect, useState } from 'react'

interface ProviderInfo {
  provider: 'openai' | 'claude' | 'gemini'
  model: string
}

const PROVIDER_META: Record<string, { label: string; dot: string }> = {
  openai:  { label: 'OpenAI',  dot: '#10a37f' },
  claude:  { label: 'Claude',  dot: '#d97706' },
  gemini:  { label: 'Gemini',  dot: '#4285F4' },
}

function modelShortName(model: string): string {
  if (model.startsWith('gpt-4o')) return 'GPT-4o'
  if (model.includes('sonnet')) return 'Claude Sonnet'
  if (model.includes('opus')) return 'Claude Opus'
  if (model.includes('haiku')) return 'Claude Haiku'
  if (model.includes('flash')) return 'Gemini Flash'
  if (model.includes('pro')) return 'Gemini Pro'
  return model
}

export function ProviderBadge({ isDark }: { isDark: boolean }) {
  const [info, setInfo] = useState<ProviderInfo | null>(null)

  useEffect(() => {
    fetch('/api/provider')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {})
  }, [])

  if (!info) return null

  const meta = PROVIDER_META[info.provider] ?? { label: info.provider, dot: '#888' }
  const name = modelShortName(info.model)

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium select-none"
      title={`Active provider: ${info.provider} — ${info.model}`}
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.18)',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,41,59,0.6)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: meta.dot, boxShadow: `0 0 4px ${meta.dot}99` }}
      />
      {name}
    </div>
  )
}
