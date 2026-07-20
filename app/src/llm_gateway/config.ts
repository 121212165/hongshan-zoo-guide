// LLM Gateway 配置（手册 §1.2）
// 密钥从 .env 注入；.env 不入库，仅 .env.example 作为模板。
// 默认走阿里云百炼 DashScope 的 OpenAI 兼容接口（赛题全案 §2.5 推荐模型栈）。

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 手动加载 .env（避免 dotenv 依赖；process.loadEnvFile 在 tsx 下不稳定）
// 尝试几个候选位置：app/.env → 仓库根 .env
function loadEnvFile(): void {
  const candidates = [
    resolve(__dirname, '../../../.env'), // app/.env（相对于 app/src/llm_gateway/）
    resolve(__dirname, '../../../../.env'), // 仓库根 .env
    resolve(process.cwd(), '.env'), // cwd/.env
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const raw = readFileSync(p, 'utf-8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq < 0) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        // 去掉首尾引号
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (key && !(key in process.env)) process.env[key] = val
      }
      return
    } catch {
      // 读失败继续尝试下一个
    }
  }
}
loadEnvFile()

export interface LLMConfig {
  apiKey: string
  baseURL: string
  // 降级链（手册 §1.2 第 4 条）：Qwen3-Max → Qwen-Plus → 模板兜底
  models: [string, string]
  temperature: 0 // 铁律①：测试与评测环境 temperature=0
  timeoutMs: 8000 // 超时 8s
  maxRetry: 2 // 结构化校验失败重试 ≤2 次
}

// 视觉模型配置（Qwen-VL，走 OpenAI 兼容接口，复用同一个 baseURL）
export interface VLConfig {
  apiKey: string
  baseURL: string
  models: [string, string] // 主备：qwen-vl-plus → qwen-vl-max
  temperature: 0
  timeoutMs: 10000 // 图像识别稍慢，10s
  maxRetry: 1
}

// 语音识别配置（Paraformer，走 DashScope 原生 RESTful，异步提交+轮询）
export interface ASRConfig {
  apiKey: string
  baseURL: string // 默认 https://dashscope.aliyuncs.com/api/v1
  model: string // 默认 paraformer-v2
  pollIntervalMs: 1000 // 轮询间隔
  pollTimeoutMs: 60000 // 最长等待 60s
}

function env(key: string, fallback = ''): string {
  const v = process.env[key]
  return v && v.length > 0 ? v : fallback
}

export function loadConfig(): LLMConfig {
  const apiKey = env('LLM_API_KEY')
  const baseURL = env('LLM_BASE_URL', 'https://llm-jo3aa3w7x9si9ghp.cn-beijing.maas.aliyuncs.com/compatible-mode/v1')
  const primary = env('LLM_MODEL_PRIMARY', 'qwen-plus')
  const secondary = env('LLM_MODEL_SECONDARY', 'qwen-turbo')
  return {
    apiKey,
    baseURL,
    models: [primary, secondary],
    temperature: 0,
    timeoutMs: 8000,
    maxRetry: 2,
  }
}

export function loadVLConfig(): VLConfig {
  // VL 复用 LLM 的 apiKey 和 baseURL（同一个 OpenAI 兼容端点支持文本+多模态）
  const apiKey = env('LLM_API_KEY')
  const baseURL = env('VL_BASE_URL', env('LLM_BASE_URL', 'https://llm-jo3aa3w7x9si9ghp.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'))
  const primary = env('VL_MODEL_PRIMARY', 'qwen-vl-plus')
  const secondary = env('VL_MODEL_SECONDARY', 'qwen-vl-max')
  return {
    apiKey,
    baseURL,
    models: [primary, secondary],
    temperature: 0,
    timeoutMs: 10000,
    maxRetry: 1,
  }
}

export function loadASRConfig(): ASRConfig {
  // ASR 走 DashScope 原生 RESTful（不走 OpenAI 兼容端点）
  // 百炼工作空间的 apiKey 在 dashscope.aliyuncs.com 通用
  const apiKey = env('LLM_API_KEY')
  const baseURL = env('ASR_BASE_URL', 'https://dashscope.aliyuncs.com/api/v1')
  const model = env('ASR_MODEL', 'paraformer-v2')
  return {
    apiKey,
    baseURL,
    model,
    pollIntervalMs: 1000,
    pollTimeoutMs: 60000,
  }
}

// 运行模式：replay=命中 cassette 直接返回（CI 零成本）；live=真实调用并写回 cassette
export type GatewayMode = 'replay' | 'live'

export function getMode(): GatewayMode {
  const m = env('LLM_GATEWAY_MODE', 'live')
  return m === 'replay' ? 'replay' : 'live'
}
