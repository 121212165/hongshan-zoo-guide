// 语音识别接入（Paraformer，DashScope 原生 RESTful API）
// 流程：提交任务（POST，含音频 URL）→ 轮询任务（GET）→ 返回转写文本
//
// 限制：录音文件识别需要公网可访问的音频 URL。
// 本地 demo 的前端录音因无公网地址，无法直接走此接口；
// 前端实时 ASR 需走 WebSocket（paraformer-realtime-v2），见 docs。
// 本模块用于：脚本/评测场景验证 ASR 连通性（用公网示例音频）。

import { loadASRConfig, type ASRConfig } from './config'

export interface ASRSubmitResult {
  taskId: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN'
  output?: string // 转写文本（SUCCEEDED 时有值）
  error?: string
}

function trace(tag: string, level: 'info' | 'warn' | 'error', msg: string, extra?: unknown): void {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${tag}] [${level}] ${msg}`
  if (level === 'error') console.error(line, extra ?? '')
  else if (level === 'warn') console.warn(line, extra ?? '')
  else console.log(line, extra ?? '')
}

// 提交录音文件识别任务
async function submitTask(cfg: ASRConfig, audioUrl: string, tag: string): Promise<string> {
  const url = `${cfg.baseURL}/services/audio/asr/transcription`
  const body = {
    model: cfg.model,
    input: {
      file_urls: [audioUrl],
    },
    parameters: {
      language_hints: ['zh', 'en'], // 中文为主，兼容英文
    },
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`ASR 提交失败 HTTP ${resp.status}: ${text}`)
  }

  const data = await resp.json()
  const taskId = data?.output?.task_id
  if (!taskId) {
    throw new Error(`ASR 提交响应无 task_id: ${JSON.stringify(data)}`)
  }
  trace(tag, 'info', `task submitted · task_id=${taskId}`)
  return taskId
}

// 查询任务状态
async function queryTask(cfg: ASRConfig, taskId: string, tag: string): Promise<ASRSubmitResult> {
  const url = `${cfg.baseURL}/tasks/${taskId}`
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`ASR 查询失败 HTTP ${resp.status}: ${text}`)
  }
  const data = await resp.json()
  const status = (data?.output?.task_status ?? 'UNKNOWN') as ASRSubmitResult['status']
  let output: string | undefined
  let error: string | undefined

  if (status === 'SUCCEEDED') {
    // 转写结果是 OSS 上的 JSON URL，需要再 fetch 拿到纯文本
    const results = data?.output?.results
    if (Array.isArray(results) && results.length > 0) {
      const transcriptionUrl = results[0].transcription_url
      if (transcriptionUrl) {
        try {
          const trResp = await fetch(transcriptionUrl)
          if (trResp.ok) {
            const trData = await trResp.json()
            // JSON 结构：{ transcripts: [{ text: "...", ... }], ... } 或 { text: "..." }
            const transcripts = trData?.transcripts
            if (Array.isArray(transcripts) && transcripts.length > 0) {
              output = transcripts.map((t: { text?: string }) => t.text ?? '').join(' ')
            } else if (trData?.text) {
              output = trData.text
            } else {
              output = JSON.stringify(trData).slice(0, 500)
            }
          } else {
            output = `[转写结果 URL] ${transcriptionUrl}`
          }
        } catch (e) {
          trace(tag, 'warn', `fetch transcription_url failed: ${e instanceof Error ? e.message : e}`)
          output = `[转写结果 URL] ${transcriptionUrl}`
        }
      } else {
        output = JSON.stringify(results[0])
      }
    } else {
      output = JSON.stringify(data?.output)
    }
  } else if (status === 'FAILED') {
    error = data?.output?.message ?? '未知错误'
  }

  return { taskId, status, output, error }
}

// 主入口：提交 + 轮询直到完成
export async function transcribe(audioUrl: string, opts: { tag?: string } = {}): Promise<ASRSubmitResult> {
  const cfg = loadASRConfig()
  const tag = opts.tag ?? 'asr'

  if (!cfg.apiKey) {
    throw new Error('LLM_API_KEY 未配置：请在 app/.env 设置（ASR 复用 LLM 密钥）')
  }

  trace(tag, 'info', `start · model=${cfg.model} · audio=${audioUrl.slice(0, 80)}...`)
  const start = Date.now()

  const taskId = await submitTask(cfg, audioUrl, tag)

  // 轮询
  const deadline = Date.now() + cfg.pollTimeoutMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs))
    const r = await queryTask(cfg, taskId, tag)
    if (r.status === 'SUCCEEDED') {
      trace(tag, 'info', `done · ${Date.now() - start}ms`)
      return r
    }
    if (r.status === 'FAILED') {
      trace(tag, 'error', `failed: ${r.error}`)
      throw new Error(`ASR 任务失败: ${r.error}`)
    }
    trace(tag, 'info', `polling · status=${r.status}`)
  }

  throw new Error(`ASR 任务超时（${cfg.pollTimeoutMs}ms）`)
}
