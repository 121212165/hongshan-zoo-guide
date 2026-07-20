import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取 app/.env（服务端可见，无 VITE_ 前缀的变量不会暴露给浏览器）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    plugins: [
      react(),
      {
        // 本地 dev server 的 API 中间件（保护密钥：浏览器只调 /api/*，密钥留在服务端）
        name: 'api-middleware',
        configureServer(server) {
          // POST /api/vision { image: base64|url, prompt } → { text, model }
          server.middlewares.use('/api/vision', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }
            try {
              const chunks: Buffer[] = []
              for await (const chunk of req) chunks.push(chunk as Buffer)
              const { image, prompt } = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { image: string; prompt: string }

              if (!env.LLM_API_KEY) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'LLM_API_KEY 未配置（app/.env）' }))
                return
              }

              const baseURL = env.LLM_BASE_URL || 'https://llm-jo3aa3w7x9si9ghp.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'
              const model = env.VL_MODEL_PRIMARY || 'qwen-vl-plus'
              const r = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${env.LLM_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model,
                  temperature: 0,
                  messages: [{
                    role: 'user',
                    content: [
                      { type: 'image_url', image_url: { url: image } },
                      { type: 'text', text: prompt },
                    ],
                  }],
                }),
              })
              const data = await r.json() as { choices?: { message: { content?: string } }[]; model?: string; usage?: unknown }
              if (!r.ok) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `DashScope ${r.status}: ${JSON.stringify(data)}` }))
                return
              }
              const text = data.choices?.[0]?.message?.content ?? ''
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text, model: data.model, usage: data.usage }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
            }
          })

          // POST /api/chat { messages } → { text, model }
          // 供前端调用 LLM（如基于 ASR 转写结果生成回答）
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }
            try {
              const chunks: Buffer[] = []
              for await (const chunk of req) chunks.push(chunk as Buffer)
              const { messages } = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { messages: Array<{ role: string; content: string }> }

              if (!env.LLM_API_KEY) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'LLM_API_KEY 未配置（app/.env）' }))
                return
              }

              const baseURL = env.LLM_BASE_URL || 'https://llm-jo3aa3w7x9si9ghp.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'
              const model = env.LLM_MODEL_PRIMARY || 'qwen-plus'
              const r = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${env.LLM_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model, temperature: 0, messages }),
              })
              const data = await r.json() as { choices?: { message: { content?: string } }[]; model?: string; usage?: unknown }
              if (!r.ok) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: `DashScope ${r.status}: ${JSON.stringify(data)}` }))
                return
              }
              const text = data.choices?.[0]?.message?.content ?? ''
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text, model: data.model, usage: data.usage }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
            }
          })
        },
      },
    ],
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
