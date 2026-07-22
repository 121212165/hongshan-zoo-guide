// 游中 · 陪逛讲解（三人设叙事 + 多模态真实接入 + 预期管理反转——本 Demo 的灵魂）
// 阶段2：拍/说两入口统一汇入 tourStore 导游消息流（trigger=vision/asr），
//        与「到」（自动到达）共享同一条消息列表。
import { useMemo, useRef, useState } from 'react'
import { getAnimalsByVenue, personaMeta, type AnimalCard, type Persona } from '@/data/animals'
import { getFictionalAnimalsByVenue } from '@/data/fictional_zoo/fictional_animals'
import { nodes, nodeMap, shortestMin } from '@/data/poi'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Mic, EyeOff, BookMarked, X, Quote, Compass, Sparkles } from 'lucide-react'
import { useTourStore } from '@/lib/tourStore'
import type { ArriveContext } from '@/lib/guide'

interface Props {
  venueId: string
  onVenue: (id: string) => void
  persona: Persona
  onPersona: (p: Persona) => void
  collected: string[]
  onCollect: (animalId: string) => void
}

const venues = nodes.filter((n) => n.type === 'venue')

// 预设问题池（浏览器端用 Web Speech API 降级；demo 中用预设问题代替真实转写）
const qaBank = [
  '它为什么不理我呀？',
  '可以喂它吃点东西吗？',
  '它今天过得好吗？',
]

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export default function ExploreTab({ venueId, onVenue, persona, onPersona, collected, onCollect }: Props) {
  const [dataset, setDataset] = useState<'hongshan' | 'fictional'>('hongshan')
  const isFictional = dataset === 'fictional'

  const getAnimals = useMemo(() => {
    return isFictional ? getFictionalAnimalsByVenue : getAnimalsByVenue
  }, [isFictional])

  const venueAnimals = useMemo(() => getAnimals(venueId), [venueId, getAnimals])
  const [animalId, setAnimalId] = useState<string | null>(null)
  const current: AnimalCard | undefined = venueAnimals.find((a) => a.id === animalId) ?? venueAnimals[0]

  const [scanning, setScanning] = useState(false)
  const [listening, setListening] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [hiddenOpen, setHiddenOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const venue = nodeMap[venueId]

  const recognizePhoto = useTourStore((s) => s.recognizePhoto)
  const askQuestion = useTourStore((s) => s.askQuestion)
  const plan = useTourStore((s) => s.plan)
  const currentNodeId = useTourStore((s) => s.currentId)

  const buildCtx = (): ArriveContext & { currentNodeId?: string | null } => ({
    persona,
    planStops: plan?.stops ?? [],
    visitedIds: useTourStore.getState().visitedIds,
    nodeName: venue?.name ?? '',
    currentNodeId: currentNodeId ?? venueId,
  })

  // 拍照 → 捕获图像 → 走 tourStore.recognizePhoto（统一消息流）
  const doScan = async () => {
    if (!current || scanning) return
    setScanning(true)
    setStatusMsg('正在启动相机…')
    try {
      let image: string

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
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
        console.warn('[scan] 摄像头不可用，降级到占位图:', camErr instanceof Error ? camErr.message : camErr)
        image = current.emoji
          ? `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" font-size="120" text-anchor="middle" dominant-baseline="central">${current.emoji}</text></svg>`)}`
          : ''
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      setStatusMsg('照片已发送，正在识别…')
      await recognizePhoto(image, buildCtx())
      setStatusMsg('识别结果已在导游面板')
      setTimeout(() => setStatusMsg(null), 2500)
    } catch (err) {
      setStatusMsg(`❌ 识别出错：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setScanning(false)
    }
  }

  // 语音/预设提问 → 走 tourStore.askQuestion（统一消息流，trigger=asr）
  const doAsk = async () => {
    if (!current || listening) return
    setListening(true)
    setStatusMsg('正在聆听…')
    try {
      // 浏览器端 ASR 降级：尝试 Web Speech API；不可用时用预设问题
      let question = qaBank[Math.floor(Math.random() * qaBank.length)]

      const w = window as unknown as Record<string, unknown>
      const SpeechRecognitionCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined

      if (SpeechRecognitionCtor) {
        try {
          question = await new Promise<string>((resolve) => {
            const recognition = new SpeechRecognitionCtor()
            let settled = false
            recognition.lang = 'zh-CN'
            recognition.interimResults = false
            recognition.maxAlternatives = 1
            recognition.onresult = (e) => {
              if (settled) return
              settled = true
              const text = e.results?.[0]?.[0]?.transcript
              resolve(text && text.trim() ? text.trim() : qaBank[Math.floor(Math.random() * qaBank.length)])
              try { recognition.stop() } catch { /* ignore */ }
            }
            recognition.onerror = () => {
              if (!settled) {
                settled = true
                resolve(qaBank[Math.floor(Math.random() * qaBank.length)])
              }
            }
            recognition.onend = () => {
              if (!settled) {
                settled = true
                resolve(qaBank[Math.floor(Math.random() * qaBank.length)])
              }
            }
            try { recognition.start() } catch { resolve(qaBank[Math.floor(Math.random() * qaBank.length)]) }
            setTimeout(() => {
              if (!settled) {
                settled = true
                resolve(qaBank[Math.floor(Math.random() * qaBank.length)])
                try { recognition.stop() } catch { /* ignore */ }
              }
            }, 6000)
          })
        } catch {
          // Web Speech API 不可用，已降级到预设问题
        }
      }

      setStatusMsg(`正在回答：「${question}」…`)
      await askQuestion(question, buildCtx(), 'asr')
      setStatusMsg('回答已在导游面板')
      setTimeout(() => setStatusMsg(null), 2500)
    } catch (err) {
      setStatusMsg(`❌ 提问出错：${err instanceof Error ? err.message : String(err)}`)
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
      <div className="flex gap-2 items-center px-1">
        <Button
          variant={isFictional ? 'outline' : 'default'}
          size="sm"
          className="rounded-full"
          onClick={() => { setDataset('hongshan'); setAnimalId(null); setStatusMsg(null) }}
        >
          红山（真实）
        </Button>
        <Button
          variant={isFictional ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => { setDataset('fictional'); setAnimalId(null); setStatusMsg(null) }}
        >
          <Sparkles className="w-3 h-3 mr-1" /> 千园计划（虚构）
        </Button>
      </div>
      {isFictional && (
        <div className="text-xs text-muted-foreground px-1 rounded-lg bg-amber-50 px-3 py-2 leading-relaxed">
          🌱 演示模式：已切换到「县城小动物园」虚构数据层（7 只虚构个体）。同一套 Agent 路由、立场话术、人设叙事均跑通——验证「千园计划」可复用能力。
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {venues.map((v) => {
          const emojis = getAnimals(v.id).map((a) => a.emoji).join('')
          return (
            <button
              key={v.id}
              onClick={() => { onVenue(v.id); setAnimalId(null); setStatusMsg(null) }}
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

            <p className="text-[15px] leading-relaxed">{current.say[persona]}</p>
            <div className="text-xs text-muted-foreground">同一只动物，三种讲法 · 当前：{personaMeta[persona].hint}</div>

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

            {statusMsg && <div className="text-xs rounded-lg bg-muted px-3 py-2">{statusMsg}</div>}

            <Button className="w-full rounded-xl" variant={collected.includes(current.id) ? 'secondary' : 'default'} onClick={() => onCollect(current.id)}>
              <BookMarked className="w-4 h-4 mr-2" /> {collected.includes(current.id) ? '已收藏' : '收藏这个故事到手账'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground">
        拍 / 说 / 到 三路输入统一汇入导游面板 · 视觉走 Qwen-VL · 语音优先 Web Speech API · 所有回答基于档案卡 grounding
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

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
