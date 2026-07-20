// Qwen-VL 连通性 smoke test
// 用法（在 app/ 目录下）：
//   node node_modules/tsx/dist/cli.mjs --tsconfig ../evals/tsconfig.json ../evals/smoke_vision.ts
//
// 用 DashScope 官方示例图（狗和女孩）验证 Qwen-VL 可用

import { recognize, loadVLConfig } from '@/llm_gateway'

async function main() {
  const cfg = loadVLConfig()
  console.log('\n═══ Qwen-VL Smoke Test ═══')
  console.log(`baseURL: ${cfg.baseURL}`)
  console.log(`primary: ${cfg.models[0]}`)
  console.log(`secondary: ${cfg.models[1]}`)
  console.log(`apiKey: ${cfg.apiKey ? cfg.apiKey.slice(0, 12) + '...' : '(未配置!)'}`)

  if (!cfg.apiKey) {
    console.error('\n❌ LLM_API_KEY 未配置，请检查 app/.env')
    process.exit(1)
  }

  const imageUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg'
  const prompt = '请用一句话描述这张图片里有什么动物。'

  console.log(`\n图片: ${imageUrl}`)
  console.log(`提问: ${prompt}`)
  console.log('调用中...')

  try {
    const r = await recognize(imageUrl, prompt, { tag: 'smoke-vl', forceLive: true })
    console.log('\n✅ 调用成功')
    console.log(`模型: ${r.model}`)
    console.log(`耗时: ${r.elapsedMs}ms`)
    console.log(`缓存命中: ${r.fromCache}`)
    if (r.usage) {
      console.log(
        `Tokens: prompt=${r.usage.promptTokens} completion=${r.usage.completionTokens} total=${r.usage.totalTokens}`
      )
    }
    console.log('\n--- 识别结果 ---')
    console.log(r.text)
    console.log('--- end ---\n')

    if (!r.text || r.text.length < 5) {
      console.error('❌ 识别结果过短，疑似异常')
      process.exit(1)
    }
    console.log('✅ Smoke test 通过')
  } catch (err) {
    console.error('\n❌ 调用失败:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
