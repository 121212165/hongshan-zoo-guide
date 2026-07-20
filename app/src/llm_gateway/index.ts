// LLM Gateway 唯一入口（手册 §1.2：调用/录制/重试/降级/trace 都收敛在这里）
// 三类模型收敛到同一 Gateway：
//   - chat:    文本语言模型（Qwen-Plus / Qwen-Turbo）
//   - vision:  视觉语言模型（Qwen-VL-Plus / Qwen-VL-Max）
//   - asr:     语音识别（Paraformer-v2）
export { chat } from './client'
export type { ChatMessage, ChatOptions, ChatResult } from './client'

export { vision, recognize } from './vision'
export type { VLMessage, VLOptions, VLResult } from './vision'

export { transcribe } from './asr'
export type { ASRSubmitResult } from './asr'

export { loadConfig, loadVLConfig, loadASRConfig, getMode } from './config'
export type { LLMConfig, VLConfig, ASRConfig, GatewayMode } from './config'
