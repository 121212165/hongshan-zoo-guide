// 游中 · 陪逛讲解（三人设叙事 + 多模态真实接入 + 预期管理反转——本 Demo 的灵魂）
import { useMemo, useRef, useState } from 'react'
import { getAnimalsByVenue, personaMeta, type AnimalCard, type Persona } from '@/data/animals'
import { getFictionalAnimalsByVenue } from '@/data/fictional_zoo/fictional_animals'
import { nodes, nodeMap, shortestMin } from '@/data/poi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Mic, EyeOff, BookMarked, X, Quote, Compass, Sparkles } from 'lucide-react'

interface Props {
  venueId: string
  onVenue: (id: string) => void
  persona: Persona
  onPersona: (p: Persona) => void
  collected: string[]
  onCollect: (animalId: string) => void
}

const venues = nodes.filter((n) => n.type === 'venue')

// 预设问题池（前端无 ASR 公网回调，用预设问题替代真实转写；
// 答案改由 /api/chat 调 LLM 基于档案卡 grounding 生成）
const qaBank = [
  '它为什么不理我呀？',
  '可以喂它吃点东西吗？',
  '它今天过得好吗？',
]

// Qwen-VL 识别 prompt（要求模型按 JSON 返回，便于前端解析）
const VL_PROMPT = '请识别图片中的动物，按 JSON 格式返回：{"species":"物种中文名","name":"如果是红山动物园的明星动物请说出名字，否则留空","confidence":0到1的浮点数}。只返回 JSON，不要其他文字。'

export default function ExploreTab({ venueId, onVenue, persona, onPersona, collected, onCollect }: Props) {
  // 「千园计划」演示：同一套 Agent 在虚构县城小动物园数据上跑通
  // 默认红山真实数据；切换到 fictional 后，getAnimalsByVenue/getAnimals 走虚构数据层
  const [dataset, setDataset] = useState<'hongshan' | 'fictional'>('hongshan')
  const isFictional = dataset === 'fictional'

  const getAnimals = useMemo(() => {
    return isFictional ? getFictionalAnimalsByVenue : getAnimalsByVenue
  }, [isFictional])

  const venueAnimals = useMemo(() => getAnimals(venueId), [venueId, getAnimals])
  const [animalId, setAnimalId] = useState<string | null>(null)
  const current: AnimalCard | undefined = venueAnimals.find((a) => a.id === animalId) ?? venueAnimals[0]

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [qa, setQa] = useState<{ q: string; a: string } | null>(null)
  const [hiddenOpen, setHiddenOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const venue = nodeMap[venueId]

  // 拍照 → Qwen-VL 识别
  const doScan = async () => {
    if (!current) return
    setScanning(true)
    setScanResult(null)
    try {
      let image: string

      // 尝试调用摄像头拍照
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          // 等一帧让画面稳定
          await new Promise((r) => setTimeout(r, 600))
        }
        if (!canvasRef.current || !videoRef.current) throw new Error('canvas/video 未就绪')
        const w = videoRef.current.videoWidth || 640
        const h = videoRef.current.videoHeight || 480
        canvasRef.current.width = w
        canvasRef.current.height = h
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) throw new Error('canvas 2d context 不可用')
        ctx.drawImage(videoRef.current, 0, 0, w, h)
        image = canvasRef.current.toDataURL('image/jpeg', 0.8)
      } catch (camErr) {
        // 摄像头不可用（权限拒绝/无设备/非 https）→ 用当前动物的 emoji 占位图降级
        console.warn('[scan] 摄像头不可用，降级到占位图:', camErr instanceof Error ? camErr.message : camErr)
        image = current.emoji
          ? `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" font-size="120" text-anchor="middle" dominant-baseline="central">${current.emoji}</text></svg>`)}`
          : ''
      }

      // 关闭摄像头流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      // 调 /api/vision
      const resp = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, prompt: VL_PROMPT }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)

      // 尝试解析 JSON 结果
      let display = data.text || ''
      try {
        const m = data.text.match(/\{[^}]+\}/s)
        if (m) {
          const obj = JSON.parse(m[0])
          const conf = typeof obj.confidence === 'number' ? (obj.confidence * 100).toFixed(1) : '—'
          display = `Qwen-VL 识别：${obj.species || '未知物种'}${obj.name ? ' · ' + obj.name : ''}（置信度 ${conf}%）`
        }
      } catch {
        // JSON 解析失败，直接显示原文
      }
      setScanResult(display)
    } catch (err) {
      setScanResult(`❌ 识别失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setScanning(false)
    }
  }

  // 录音（前端无公网 ASR 回调）→ 用预设问题 → LLM 生成回答
  const doAsk = async () => {
    if (!current || listening) return
    setListening(true)
    setQa(null)
    try {
      const question = qaBank[Math.floor(Math.random() * qaBank.length)]

      // 用 LLM 基于档案卡 grounding 生成回答
      const factsBlock = current.facts.map((f) => `- ${f.text}（来源：${f.source}）`).join('\n')
      const messages = [
        {
          role: 'system' as const,
          content: `你是红山森林动物园的导览员「红山朋友」。坚持动物福利立场：不投喂、不表演、不触摸、不打扰。无据不讲——只用档案卡里的事实。

【档案卡 · ${current.name}（${current.species}）】
事实档案：
${factsBlock}

福利看点：${current.welfare}

回答控制在 80 字内，用${persona === 'youth' ? '年轻人朋友口吻' : persona === 'kid' ? '给5岁孩子讲的口吻' : '给长辈讲的口吻'}。`,
        },
        { role: 'user' as const, content: question },
      ]

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)

      setQa({ q: `🎤 提问：「${question}」`, a: data.text || '(空回答)' })
    } catch {
      // LLM 失败降级到本地模板
      const question = qaBank[Math.floor(Math.random() * qaBank.length)]
      let fallback = ''
      if (question.includes('不理')) fallback = `${current.name}有自己的节奏：${current.activeHint}。在红山，动物没有讨好游客的义务。`
      else if (question.includes('喂')) fallback = `不可以。红山 2014 年起全园禁止投喂，人类零食会让${current.name}生病。`
      else fallback = `从作息看还不错：${current.activeHint}。`
      setQa({ q: `🎤 提问：「${question}」（LLM 降级到本地模板）`, a: fallback })
    } finally {
      setListening(false)
    }
  }

  const nearestAlt = useMemo(() => {
    let best: string | null = null
    let bd = Infinity
    for (const v of venues) {
      if (v.id === venueId) continue
      const d = shortestMin(venueId, v.id)
      if (d < bd) { bd = d; best = v.id }
    }
    return best ? { id: best, min: bd } : null
  }, [venueId])

  return (
    <div className="space-y-4 pb-24">
      {/* 千园计划演示：切换数据集，同一套 Agent 跑通新数据 */}
      <div className="flex gap-2 items-center px-1">
        <Button
          variant={isFictional ? 'outline' : 'default'}
          size="sm"
          className="rounded-full"
          onClick={() => { setDataset('hongshan'); setAnimalId(null); setScanResult(null); setQa(null) }}
        >
          红山（真实）
        </Button>
        <Button
          variant={isFictional ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => { setDataset('fictional'); setAnimalId(null); setScanResult(null); setQa(null) }}
        >
          <Sparkles className="w-3 h-3 mr-1" /> 千园计划（虚构）
        </Button>
      </div>
      {isFictional && (
        <div className="text-xs text-muted-foreground px-1 rounded-lg bg-amber-50 px-3 py-2 leading-relaxed">
          🌱 演示模式：已切换到「县城小动物园」虚构数据层（7 只虚构个体）。同一套 Agent 路由、立场话术、人设叙事均跑通——验证「千园计划」可复用能力。
        </div>
      )}

      {/* 场馆选择 */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {venues.map((v) => {
          const emojis = getAnimals(v.id).map((a) => a.emoji).join('')
          return (
            <button
              key={v.id}
              onClick={() => { onVenue(v.id); setAnimalId(null); setScanResult(null); setQa(null) }}
              className={`shrink-0 px-3 py-2 rounded-xl border text-sm transition-all ${venueId === v.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border'}`}
            >
              {emojis} {v.name}
            </button>
          )
        })}
      </div>

      <div className="text-xs text-muted-foreground px-1">
        📍 当前：{venue?.name}{venue?.desc ? ` · ${venue.desc}` : ''}（定位触发 · 演示为手动选择）
      </div>

      {current && (
        <Card className={`border-0 shadow-sm overflow-hidden ${current.memorial ? 'bg-[#f4efe6]' : ''}`}>
          <div className={`px-4 pt-4 pb-3 ${current.memorial ? 'bg-[#e8dfc9]' : 'bg-primary'}`}>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{current.emoji}</div>
              <div className={current.memorial ? 'text-foreground' : 'text-primary-foreground'}>
                <div className="text-lg font-bold">{current.name}</div>
                <div className={`text-xs ${current.memorial ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>{current.species}</div>
              </div>
              {collected.includes(current.id) && (
                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${current.memorial ? 'bg-white/70' : 'bg-white/20 text-white'}`}>已收进手账</span>
              )}
            </div>
          </div>
          <CardContent className="p-4 space-y-4">
            {/* 人设切换 */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {(Object.keys(personaMeta) as Persona[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPersona(p)}
                  className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${persona === p ? 'bg-white shadow-sm font-semibold' : 'text-muted-foreground'}`}
                >
                  {personaMeta[p].label}
                </button>
              ))}
            </div>

            {/* 叙事正文 */}
            <p className="text-[15px] leading-relaxed">{current.say[persona]}</p>
            <div className="text-xs text-muted-foreground">同一只动物，三种讲法 · 当前：{personaMeta[persona].hint}</div>

            {/* 事实与出处 */}
            <div className="space-y-1.5">
              {current.facts.map((f, i) => (
                <div key={i} className="text-xs flex gap-1.5 items-start">
                  <span className="text-primary mt-0.5">●</span>
                  <span>{f.text}<span className="text-muted-foreground">（来源：{f.source}）</span></span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-secondary/70 px-3 py-2.5 text-xs leading-relaxed">
              🌿 福利看点：{current.welfare}
            </div>

            {/* 多模态操作 */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="rounded-xl h-10 bg-white" onClick={doScan} disabled={scanning}>
                <Camera className="w-4 h-4 mr-1" /> {scanning ? '识别中…' : '拍一下'}
              </Button>
              <Button variant="outline" className="rounded-xl h-10 bg-white" onClick={doAsk} disabled={listening}>
                <Mic className="w-4 h-4 mr-1" /> {listening ? '聆听中…' : '问一句'}
              </Button>
              <Button variant="outline" className="rounded-xl h-10 bg-white border-accent text-[#9a6a1a]" onClick={() => setHiddenOpen(true)}>
                <EyeOff className="w-4 h-4 mr-1" /> 没看到它
              </Button>
            </div>

            {scanResult && <div className="text-xs rounded-lg bg-muted px-3 py-2">📷 {scanResult}</div>}
            {listening && <div className="text-xs rounded-lg bg-muted px-3 py-2 animate-pulse">🎤 正在聆听，请说出你的问题…</div>}
            {qa && (
              <div className="space-y-2">
                <div className="text-xs rounded-lg bg-muted px-3 py-2">🎤 {qa.q}</div>
                <div className="text-sm rounded-lg bg-secondary/70 px-3 py-2.5 leading-relaxed">{qa.a}</div>
              </div>
            )}

            <Button className="w-full rounded-xl" variant={collected.includes(current.id) ? 'secondary' : 'default'} onClick={() => onCollect(current.id)}>
              <BookMarked className="w-4 h-4 mr-2" /> {collected.includes(current.id) ? '已收藏' : '收藏这个故事到手账'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground">
        拍照接入 Qwen-VL · 问答接入 LLM（基于档案卡 grounding）· ASR 录音文件识别见 smoke_asr.ts
      </div>

      {/* 拍照用的隐藏 video/canvas（getUserMedia 截图） */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* 预期管理反转（灵魂时刻） */}
      {hiddenOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setHiddenOpen(false)}>
          <div className="w-full max-w-md bg-background rounded-t-3xl p-5 pb-8 space-y-4 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-bold">没看到{current.name}？</div>
              <button onClick={() => setHiddenOpen(false)} className="p-1 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-sm leading-relaxed"><span className="font-semibold">它此刻可能在：</span>{current.hidden.likely}</div>
            <div className="rounded-2xl bg-primary text-primary-foreground p-4">
              <Quote className="w-5 h-5 mb-2 opacity-70" />
              <p className="text-[15px] leading-relaxed">{current.hidden.reframe}</p>
              <p className="mt-2 text-xs opacity-80">—— 看不到，也是一种看见</p>
            </div>
            <div className="text-sm leading-relaxed"><span className="font-semibold">小攻略：</span>{current.hidden.tip}</div>
            {nearestAlt && (
              <Button variant="outline" className="w-full rounded-xl bg-white" onClick={() => { onVenue(nearestAlt.id!); setAnimalId(null); setHiddenOpen(false) }}>
                <Compass className="w-4 h-4 mr-2" /> 先去 {nearestAlt.min} 分钟外的{nodeMap[nearestAlt.id!].name}转转
              </Button>
            )}
            <Button className="w-full rounded-xl" onClick={() => { onCollect(current.id); setHiddenOpen(false) }}>
              把这个道理也收进手账
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
