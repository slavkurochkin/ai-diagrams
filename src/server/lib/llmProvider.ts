import OpenAI from 'openai'

export type Provider = 'openai' | 'claude' | 'gemini'

interface ProviderConfig {
  baseURL?: string
  apiKeyEnv: string
  modelEnv: string
  defaultModel: string
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o',
  },
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-sonnet-4-6',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.0-flash',
  },
}

function resolveModel(cfg: ProviderConfig): string {
  return process.env[cfg.modelEnv] ?? cfg.defaultModel
}

export interface LLMClient {
  client: OpenAI
  model: string
}

export function createLLMClient(provider?: Provider): LLMClient {
  provider = provider ?? (process.env.LLM_PROVIDER as Provider) ?? 'openai'
  const cfg = PROVIDERS[provider]
  const apiKey = process.env[cfg.apiKeyEnv]
  if (!apiKey) {
    throw new Error(`${cfg.apiKeyEnv} is not set`)
  }
  return {
    client: new OpenAI({ baseURL: cfg.baseURL, apiKey }),
    model: resolveModel(cfg),
  }
}

export function getApiKeyError(provider?: Provider): string | null {
  provider = provider ?? (process.env.LLM_PROVIDER as Provider) ?? 'openai'
  const cfg = PROVIDERS[provider]
  return process.env[cfg.apiKeyEnv] ? null : `${cfg.apiKeyEnv} is not set`
}
