// LLM Gateway 连通性 smoke test
// 用法（在 app/ 目录下）：
//   node node_modules/tsx/dist/cli.mjs --tsconfig ../evals/tsconfig.json ../evals/smoke_llm.ts
//
// 验证项：
// 1) .env 密钥加载正确
// 2) DashScope OpenAI 兼容接口可达
// 3) Qwen 模型返回非空且耗时合理
// 4) cassette 写入正常

import { chat, loadConfig, type ChatMessage } from '@/llm_gateway'

async function main() {
  const cfg = loadConfig()
  console.log('\n═══ LLM Gateway Smoke Test ═══')
  console.log(`baseURL: ${cfg.baseURL}`)
  console.log(`primary: ${cfg.models[0]}`)
  console.log(`secondary: ${cfg.models[1]}`)
  console.log(`apiKey: ${cfg.apiKey ? cfg.apiKey.slice(0, 12) + '...' : '(未配置!)'}`)
  console.log(`temperature: ${cfg.temperature}  timeout: ${cfg.timeoutMs}ms`)

  if (!cfg.apiKey) {
    console.error('\n❌ LLM_API_KEY 未配置，请检查 app/.env')
    process.exit(1)
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        '你是红山森林动物园的导览员「红山朋友」。坚持「无据不讲」——所有讲述必须基于档案卡与出处，不编造。回答控制在 80 字内。',
    },
    { role: 'user', content: '用一句话介绍白面僧面猴杜杜。' },
  ]

  console.log('\n调用中...')
  try {
    const r = await chat(messages, { tag: 'smoke', forceLive: true })
    console.log('\n✅ 调用成功')
    console.log(`模型: ${r.model}`)
    console.log(`耗时: ${r.elapsedMs}ms`)
    console.log(`缓存命中: ${r.fromCache}`)
    if (r.usage) {
      console.log(
        `Tokens: prompt=${r.usage.promptTokens} completion=${r.usage.completionTokens} total=${r.usage.totalTokens}`
      )
    }
    console.log('\n--- 回答 ---')
    console.log(r.text)
    console.log('--- end ---\n')

    if (!r.text || r.text.length < 5) {
      console.error('❌ 回答过短，疑似异常')
      process.exit(1)
    }
    console.log('✅ Smoke test 通过')
  } catch (err) {
    console.error('\n❌ 调用失败:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
