// LLM Gateway 客户端（手册 §1.2 设计骨架的 TS 实现）
//
// 三条铁律：
//   ① 测试与评测环境 temperature=0；
//   ② 评测跑批时 force_live=True 走真实模型；
//   ③ cassette 以内容哈希命名入库，Prompt 变了旧磁带自动失效（防假绿）。
//
// 降级链：主模型 → 备用模型 → 抛错（上层接模板话术兜底）。
// Trace：当前为结构化 console 日志，生产接 Langfuse。

import OpenAI from 'openai'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, getMode, type LLMConfig, type GatewayMode } from './config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASSETTES_DIR = resolve(__dirname, '../../../evals/cassettes')

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  tag?: string // trace 标签（如 'eval' / 'explore' / 'planner'）
  forceLive?: boolean // 铁律②：评测跑批强制走真实模型
  model?: string // 覆盖默认模型
  schema?: 'json' | 'text' // 输出格式约束
}

export interface ChatResult {
  text: string
  model: string
  fromCache: boolean
  elapsedMs: number
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
}

// 内容哈希命名（铁律③）：Prompt 变了哈希变，旧磁带自动失效
function hashKey(messages: ChatMessage[], model: string): string {
  const payload = JSON.stringify({ messages, model })
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

function cassettePath(key: string): string {
  return resolve(CASSETTES_DIR, `${key}.json`)
}

function lookupCassette(key: string): ChatResult | null {
  const p = cassettePath(key)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ChatResult
  } catch {
    return null
  }
}

function writeCassette(key: string, r: ChatResult): void {
  if (!existsSync(CASSETTES_DIR)) mkdirSync(CASSETTES_DIR, { recursive: true })
  writeFileSync(cassettePath(key), JSON.stringify(r, null, 2), 'utf-8')
}

function trace(tag: string, level: 'info' | 'warn' | 'error', msg: string, extra?: unknown): void {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${tag}] [${level}] ${msg}`
  if (level === 'error') console.error(line, extra ?? '')
  else if (level === 'warn') console.warn(line, extra ?? '')
  else console.log(line, extra ?? '')
}

async function callOnce(
  client: OpenAI,
  model: string,
  messages: ChatMessage[],
  cfg: LLMConfig,
  opts: ChatOptions
): Promise<ChatResult> {
  const start = Date.now()
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: cfg.temperature,
    timeout: cfg.timeoutMs,
    response_format: opts.schema === 'json' ? { type: 'json_object' } : undefined,
  })
  const text = resp.choices?.[0]?.message?.content ?? ''
  const usage = resp.usage
    ? {
        promptTokens: resp.usage.prompt_tokens,
        completionTokens: resp.usage.completion_tokens,
        totalTokens: resp.usage.total_tokens,
      }
    : undefined
  return {
    text,
    model,
    fromCache: false,
    elapsedMs: Date.now() - start,
    usage,
  }
}

// 主入口
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatResult> {
  const cfg = loadConfig()
  const mode: GatewayMode = getMode()
  const tag = opts.tag ?? 'llm'
  const wantLive = opts.forceLive === true || mode === 'live'

  // cassette 回放模式：先查命中
  if (!wantLive) {
    const modelForHash = opts.model ?? cfg.models[0]
    const key = hashKey(messages, modelForHash)
    const cached = lookupCassette(key)
    if (cached) {
      trace(tag, 'info', `cassette hit · model=${cached.model} · ${cached.elapsedMs}ms(orig)`)
      return { ...cached, fromCache: true, elapsedMs: 0 }
    }
    trace(tag, 'warn', 'cassette miss in replay mode, falling back to live (will record)')
  }

  if (!cfg.apiKey) {
    throw new Error('LLM_API_KEY 未配置：请在 app/.env 设置（参考 .env.example）')
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })
  const models = opts.model ? [opts.model] : cfg.models

  // 降级链：主模型 → 备用模型
  let lastErr: unknown = null
  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    // 重试 ≤ maxRetry 次（手册 §1.2 第 3 条：结构化校验失败反馈模型重试）
    for (let attempt = 0; attempt <= cfg.maxRetry; attempt++) {
      try {
        const r = await callOnce(client, model, messages, cfg, opts)
        trace(tag, 'info', `live · model=${model} · ${r.elapsedMs}ms · tokens=${r.usage?.totalTokens ?? '?'}`)
        // 写回 cassette
        const key = hashKey(messages, model)
        writeCassette(key, r)
        return r
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        trace(tag, 'warn', `attempt ${attempt + 1} on ${model} failed: ${msg}`)
      }
    }
    trace(tag, 'warn', `model ${model} exhausted, falling back to next`)
  }

  const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  trace(tag, 'error', `all models failed: ${errMsg}`)
  throw new Error(`LLM Gateway 调用失败（已尝试 ${models.length} 个模型）：${errMsg}`)
}
