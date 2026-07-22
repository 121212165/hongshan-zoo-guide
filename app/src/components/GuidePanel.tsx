// 导游浮动按钮 + 底部抽屉（任务3 + 阶段1闭环 + 阶段2多模态统一）
// 阶段2：手动提问也统一走 tourStore.askQuestion，与拍/说/到三入口共享同一消息流

import { useEffect, useRef, useState } from 'react'
import { ChevronUp, X, Send, MessageCircle, MapPin } from 'lucide-react'
import { useTourStore } from '@/lib/tourStore'
import { generateArriveMessage, type ArriveContext } from '@/lib/guide'
import { nodeMap } from '@/data/poi'
import { fmtClock } from '@/lib/planner'

const QUICK_QUESTIONS = [
  '它在干嘛？',
  '可以喂它吗？',
  '这里最值得看什么？',
  '下一段路怎么走？',
]

export default function GuidePanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastPushedIdRef = useRef<string | null>(null)

  const status = useTourStore((s) => s.status)
  const plan = useTourStore((s) => s.plan)
  const currentId = useTourStore((s) => s.currentId)
  const visitedIds = useTourStore((s) => s.visitedIds)
  const guideMessages = useTourStore((s) => s.guideMessages)
  const guideMessagesLen = useTourStore((s) => s.guideMessages.length)
  const persona = useTourStore((s) => s.persona)
  const stopsCount = useTourStore((s) => s.plan?.stops.length ?? 0)
  const endMin = useTourStore((s) => s.plan?.endMin ?? 0)
  const firstStopName = useTourStore((s) => s.plan?.stops[0]?.nodeId ?? null)
  const nextStopId = useTourStore((s) => {
    if (!s.plan) return null
    const stops = s.plan.stops
    const idx = stops.findIndex((st) => st.nodeId === s.currentId)
    if (idx < 0 || idx >= stops.length - 1) return null
    return stops[idx + 1].nodeId
  })
  const pushGuideMessage = useTourStore((s) => s.pushGuideMessage)
  const startTour = useTourStore((s) => s.startTour)
  const arriveAt = useTourStore((s) => s.arriveAt)
  const completeTour = useTourStore((s) => s.completeTour)
  const askQuestion = useTourStore((s) => s.askQuestion)

  const currentNode = currentId ? nodeMap[currentId] : null
  const isTouring = status === 'touring'
  const isCompleted = status === 'completed'
  const isGenerated = status === 'generated'

  const visitedCount = visitedIds.length

  useEffect(() => {
    if (!isTouring || !currentId) return
    if (lastPushedIdRef.current === currentId) return
    lastPushedIdRef.current = currentId

    const ctx: ArriveContext = { persona, planStops: plan?.stops ?? [], visitedIds, nodeName: nodeMap[currentId]?.name ?? '' }
    let cancelled = false
    setLoading(true)
    generateArriveMessage(currentId, ctx)
      .then(({ text, citations }) => {
        if (cancelled) return
        pushGuideMessage({ role: 'guide', text, trigger: 'arrive', nodeId: currentId })
        if (citations.length > 0) {
          pushGuideMessage({ role: 'system', text: `📚 来源：${citations.join('、')}`, nodeId: currentId })
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[guide] arrive failed:', err)
        pushGuideMessage({
          role: 'guide',
          text: `${nodeMap[currentId]?.name ?? '这里'}到了，先看看吧。`,
          trigger: 'arrive',
          nodeId: currentId,
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [currentId, isTouring, persona, plan, visitedIds, pushGuideMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [guideMessagesLen, loading])

  useEffect(() => {
    if (isCompleted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true)
    }
  }, [isCompleted])

  const handleAsk = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    setLoading(true)
    try {
      const ctx: ArriveContext & { currentNodeId?: string | null } = {
        persona,
        planStops: plan?.stops ?? [],
        visitedIds,
        nodeName: currentNode?.name ?? '',
        currentNodeId: currentId,
      }
      await askQuestion(q, ctx, 'manual')
    } finally {
      setLoading(false)
    }
  }

  const handleArriveHere = (nodeId: string) => {
    arriveAt(nodeId)
    setOpen(true)
  }

  const floatLabel = isTouring && currentNode
    ? `📍 ${currentNode.name}`
    : isCompleted
      ? '✅ 游览完成'
      : isGenerated
        ? '🚀 开始游览'
        : '红山朋友'

  const progress = stopsCount > 0 ? Math.round((visitedCount / stopsCount) * 100) : 0

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-20 z-30 flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-3 pr-4 py-2.5 shadow-lg shadow-primary/20 border border-primary-foreground/10 hover:scale-[1.02] transition-transform"
        aria-label="打开导游"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {guideMessagesLen > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-accent rounded-full border-2 border-primary" />
          )}
        </div>
        <span className="text-sm font-medium max-w-[120px] truncate">{floatLabel}</span>
        {isTouring && (
          <span className="text-[10px] bg-primary-foreground/15 rounded-full px-1.5 py-0.5">{progress}%</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-background rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '80vh', minHeight: '60vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg">
                  🍃
                </div>
                <div>
                  <div className="font-bold text-sm">红山朋友 · 导游</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isTouring && currentNode
                      ? `现在在 ${currentNode.name}`
                      : isCompleted
                        ? '行程已完成，去看手账吧'
                        : isGenerated
                          ? '路线已就绪'
                          : '随时问我'}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {guideMessagesLen === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  我是你的红山朋友。<br />
                  路线生成后，我会陪你一路走、一路讲。
                </div>
              )}
              {guideMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : m.role === 'system'
                          ? 'bg-muted text-muted-foreground text-xs italic'
                          : 'bg-white text-foreground rounded-bl-md shadow-sm border border-border/30'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2 text-sm shadow-sm border border-border/30">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isGenerated && plan && firstStopName && (
              <div className="px-4 py-2 border-t border-border/50 bg-background">
                <button
                  onClick={() => { startTour(); setOpen(true) }}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold"
                >
                  🚀 开始游览（从 {nodeMap[firstStopName]?.name ?? '北门'} 出发）
                </button>
              </div>
            )}

            {isTouring && (
              <div className="px-4 py-2 border-t border-border/50 bg-background space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{visitedCount} / {stopsCount} 站</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  {endMin > 0 && <span className="text-[10px]">{fmtClock(endMin)} 出园</span>}
                </div>
                {nextStopId && (
                  <button
                    onClick={() => handleArriveHere(nextStopId)}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    我到 {nodeMap[nextStopId]?.name} 了
                  </button>
                )}
                {!nextStopId && (
                  <button
                    onClick={() => { completeTour(); }}
                    className="w-full bg-accent text-accent-foreground rounded-xl py-2 text-sm font-semibold"
                  >
                    🎉 行程结束
                  </button>
                )}
              </div>
            )}

            {isCompleted && (
              <div className="px-4 py-3 border-t border-border/50 bg-green-50">
                <div className="text-sm text-green-800 text-center">
                  🎉 手账已自动生成，切到「手账」Tab 看看今天的足迹吧
                </div>
              </div>
            )}

            {isTouring && (
              <div className="px-4 pt-2 flex gap-2 overflow-x-auto pb-1">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-border text-xs hover:border-primary/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); handleAsk(input) }}
              className="p-3 border-t border-border/50 flex gap-2 bg-background"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isTouring ? '问红山朋友…' : isGenerated ? '点开始游览，我陪你走' : isCompleted ? '今天辛苦了' : '随时问我'}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-primary"
                disabled={isCompleted}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || isCompleted}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!open && isTouring && currentNode && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 right-4 bottom-36 z-20 max-w-md mx-auto bg-white border border-border/50 rounded-xl shadow-sm py-2 px-3 flex items-center gap-2"
        >
          <span className="text-xs text-muted-foreground">📍 {currentNode.name} · 点开看讲解</span>
          <ChevronUp className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
        </button>
      )}
    </>
  )
}
