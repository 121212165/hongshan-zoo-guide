function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      endpoint: 'asr',
      method: 'POST',
      implemented: false,
      fallback: 'browser_web_speech_api',
    })
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method Not Allowed' })
  }
  return json(res, 501, {
    error: 'asr_not_implemented',
    message: '当前生产环境未接入服务端 ASR，请优先使用浏览器 Web Speech API 转写后调用 /api/chat。',
    fallback: 'browser_web_speech_api',
  })
}
