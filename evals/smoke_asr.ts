// Paraformer ASR 连通性 smoke test
// 用法（在 app/ 目录下）：
//   node node_modules/tsx/dist/cli.mjs --tsconfig ../evals/tsconfig.json ../evals/smoke_asr.ts
//
// 用 DashScope 官方示例音频验证 Paraformer 可用
// 注意：录音文件识别是异步的（提交任务 + 轮询），耗时 5-30s

import { transcribe, loadASRConfig } from '@/llm_gateway'

async function main() {
  const cfg = loadASRConfig()
  console.log('\n═══ Paraformer ASR Smoke Test ═══')
  console.log(`baseURL: ${cfg.baseURL}`)
  console.log(`model: ${cfg.model}`)
  console.log(`apiKey: ${cfg.apiKey ? cfg.apiKey.slice(0, 12) + '...' : '(未配置!)'}`)

  if (!cfg.apiKey) {
    console.error('\n❌ LLM_API_KEY 未配置，请检查 app/.env')
    process.exit(1)
  }

  const audioUrl = 'https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_male2.wav'
  console.log(`\n音频: ${audioUrl}`)
  console.log('提交并轮询中（5-30s）...')

  try {
    const r = await transcribe(audioUrl, { tag: 'smoke-asr' })
    console.log('\n✅ 转写成功')
    console.log(`task_id: ${r.taskId}`)
    console.log(`status: ${r.status}`)
    console.log('\n--- 转写结果 ---')
    console.log(r.output ?? '(空)')
    console.log('--- end ---\n')
    console.log('✅ Smoke test 通过')
  } catch (err) {
    console.error('\n❌ 调用失败:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
