// 视觉模型接入（Qwen-VL，OpenAI 兼容接口）
// 用法：传入图片 URL 或 base64（data:image/...;base64,...），返回识别文本
// 与 chat() 共享降级链、cassette、trace 设计

import OpenAI from 'openai'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadVLConfig, getMode, type VLConfig } from './config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASSETTES_DIR = resolve(__dirname, '../../../evals/cassettes')

export interface VLMessage {
  role: 'system' | 'user' | 'assistant'
  // content 可以是字符串（纯文本）或多模态数组（text + image_url）
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >
}

export interface VLOptions {
  tag?: string
  forceLive?: boolean
  model?: string
}

export interface VLResult {
  text: string
  model: string
  fromCache: boolean
  elapsedMs: number
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
}

function hashKey(messages: VLMessage[], model: string): string {
  // 图片 base64 太长，hash 时只取前 64 字符 + 长度，避免 cassette key 爆炸
  const compact = messages.map((m) => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content }
    return {
      role: m.role,
      content: m.content.map((c) => {
        if (c.type === 'image_url') {
          const url = c.image_url.url
          return { type: 'image_url', url: url.slice(0, 64), len: url.length }
        }
        return c
      }),
    }
  })
  return createHash('sha256').update(JSON.stringify({ compact, model })).digest('hex').slice(0, 32)
}

function cassettePath(key: string): string {
  return resolve(CASSETTES_DIR, `vl_${key}.json`)
}

function lookupCassette(key: string): VLResult | null {
  const p = cassettePath(key)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as VLResult
  } catch {
    return null
  }
}

function writeCassette(key: string, r: VLResult): void {
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
  messages: VLMessage[],
  cfg: VLConfig
): Promise<VLResult> {
  const start = Date.now()
  const resp = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: cfg.temperature,
    timeout: cfg.timeoutMs,
  })
  const text = resp.choices?.[0]?.message?.content ?? ''
  const usage = resp.usage
    ? {
        promptTokens: resp.usage.prompt_tokens,
        completionTokens: resp.usage.completion_tokens,
        totalTokens: resp.usage.total_tokens,
      }
    : undefined
  return { text, model, fromCache: false, elapsedMs: Date.now() - start, usage }
}

export async function vision(messages: VLMessage[], opts: VLOptions = {}): Promise<VLResult> {
  const cfg = loadVLConfig()
  const mode = getMode()
  const tag = opts.tag ?? 'vl'
  const wantLive = opts.forceLive === true || mode === 'live'

  if (!wantLive) {
    const modelForHash = opts.model ?? cfg.models[0]
    const key = hashKey(messages, modelForHash)
    const cached = lookupCassette(key)
    if (cached) {
      trace(tag, 'info', `cassette hit · model=${cached.model} · ${cached.elapsedMs}ms(orig)`)
      return { ...cached, fromCache: true, elapsedMs: 0 }
    }
    trace(tag, 'warn', 'cassette miss in replay mode, falling back to live')
  }

  if (!cfg.apiKey) {
    throw new Error('LLM_API_KEY 未配置：请在 app/.env 设置（VL 复用 LLM 密钥）')
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })
  const models = opts.model ? [opts.model] : cfg.models

  let lastErr: unknown = null
  for (const model of models) {
    for (let attempt = 0; attempt <= cfg.maxRetry; attempt++) {
      try {
        const r = await callOnce(client, model, messages, cfg)
        trace(tag, 'info', `live · model=${model} · ${r.elapsedMs}ms · tokens=${r.usage?.totalTokens ?? '?'}`)
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
  throw new Error(`VL Gateway 调用失败（已尝试 ${models.length} 个模型）：${errMsg}`)
}

// 便捷封装：单图 + 文本 prompt
export async function recognize(image: string, prompt: string, opts: VLOptions = {}): Promise<VLResult> {
  const messages: VLMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: image } },
        { type: 'text', text: prompt },
      ],
    },
  ]
  return vision(messages, opts)
}
