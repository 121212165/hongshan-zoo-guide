function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  return raw ? JSON.parse(raw) : {}
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, { ok: true, endpoint: 'chat', method: 'POST', hasKey: Boolean(process.env.LLM_API_KEY) })
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method Not Allowed' })
  }

  try {
    const { messages } = await readJson(req)
    if (!process.env.LLM_API_KEY) {
      return json(res, 500, { error: 'LLM_API_KEY 未配置（Vercel Project Environment Variables）' })
    }

    const baseURL = process.env.LLM_BASE_URL || 'https://llm-jo3aa3w7x9si9ghp.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'
    const model = process.env.LLM_MODEL_PRIMARY || 'qwen-plus'
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, temperature: 0, messages }),
    })
    const data = await response.json()
    if (!response.ok) {
      return json(res, 502, { error: `DashScope ${response.status}: ${JSON.stringify(data)}` })
    }
    const text = data?.choices?.[0]?.message?.content ?? ''
    return json(res, 200, { text, model: data.model, usage: data.usage })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) })
  }
}
