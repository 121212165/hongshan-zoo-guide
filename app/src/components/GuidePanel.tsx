// 导游浮动按钮 + 底部抽屉（任务3）
// 「红山朋友」全程陪伴：
//   - 浮动按钮（右下角）：显示当前节点 / 进度
//   - 点击展开底部抽屉：消息列表 + 输入框 + 快捷问
//   - 智能：currentId 变化时自动调 generateArriveMessage 推讲解
//   - 关键节点自动推 + 用户主动问（混合模式）

import { useEffect, useRef, useState } from 'react'
import { ChevronUp, X, Send, MessageCircle, MapPin } from 'lucide-react'
import { useTourStore } from '@/lib/tourStore'
import { generateArriveMessage, generateAskAnswer, type ArriveContext } from '@/lib/guide'
import { nodeMap } from '@/data/poi'
import type { Persona } from '@/data/animals'
import { fmtClock } from '@/lib/planner'

interface Props {
  persona: Persona
}

const QUICK_QUESTIONS = [
  '它在干嘛？',
  '可以喂它吗？',
  '这里最值得看什么？',
  '下一段路怎么走？',
]

export default function GuidePanel({ persona }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastPushedIdRef = useRef<string | null>(null)

  // 从 store 取状态和 actions（全部 inline selector，返回稳定引用）
  const status = useTourStore((s) => s.status)
  const plan = useTourStore((s) => s.plan)
  const currentId = useTourStore((s) => s.currentId)
  const visitedIds = useTourStore((s) => s.visitedIds)
  const guideMessages = useTourStore((s) => s.guideMessages)
  const guideMessagesLen = useTourStore((s) => s.guideMessages.length)
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
  // actions（函数引用稳定）
  const pushGuideMessage = useTourStore((s) => s.pushGuideMessage)
  const startTour = useTourStore((s) => s.startTour)
  const arriveAt = useTourStore((s) => s.arriveAt)
  const completeTour = useTourStore((s) => s.completeTour)

  const currentNode = currentId ? nodeMap[currentId] : null
  const isTouring = status === 'touring'
  const isCompleted = status === 'completed'
  const isGenerated = status === 'generated'

  // 上下文：给导游用的 persona + startHour + visitedCount
  const startHour = plan?.stops[0] ? plan.stops[0].arriveMin / 60 : 9
  const visitedCount = visitedIds.length

  // 自动推讲解：currentId 变化时触发
  useEffect(() => {
    if (!isTouring || !currentId) return
    if (lastPushedIdRef.current === currentId) return
    lastPushedIdRef.current = currentId

    const ctx: ArriveContext = { persona, startHour, visitedCount }
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
  }, [currentId, isTouring, persona, startHour, visitedCount, pushGuideMessage])

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [guideMessagesLen, loading])

  // 处理用户提问
  const handleAsk = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setInput('')
    pushGuideMessage({ role: 'user', text: q, trigger: 'manual' })

    try {
      const ctx2: ArriveContext & { currentNodeId?: string | null } = {
        persona,
        startHour,
        visitedCount,
        currentNodeId: currentId,
      }
      const { text, citations } = await generateAskAnswer(q, ctx2)
      pushGuideMessage({ role: 'guide', text, trigger: 'manual' })
      if (citations.length > 0) {
        pushGuideMessage({ role: 'system', text: `📚 来源：${citations.join('、')}` })
      }
    } catch (err) {
      pushGuideMessage({
        role: 'guide',
        text: `这个问题我没接住：${err instanceof Error ? err.message : String(err)}`,
        trigger: 'manual',
      })
    } finally {
      setLoading(false)
    }
  }

  // 节点切换：「到这了」按钮
  const handleArriveHere = (nodeId: string) => {
    arriveAt(nodeId)
    setOpen(true)
  }

  // 浮动按钮：根据状态显示不同内容
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
      {/* 浮动按钮（右下角，避开底部 nav） */}
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

      {/* 底部抽屉 */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-background rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '80vh', minHeight: '60vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 抽屉头 */}
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
                        ? '行程已完成'
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

            {/* 消息列表 */}
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

            {/* 状态控制条 */}
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
                {/* 当前进度 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{visitedCount} / {stopsCount} 站</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  {endMin > 0 && <span className="text-[10px]">{fmtClock(endMin)} 出园</span>}
                </div>
                {/* 到这了 / 下一站 / 完成 */}
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

            {/* 快捷问 */}
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

            {/* 输入框 */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleAsk(input) }}
              className="p-3 border-t border-border/50 flex gap-2 bg-background"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isTouring ? '问红山朋友…' : isGenerated ? '点开始游览，我陪你走' : '随时问我'}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 折叠提示条（仅游览中显示，引导展开） */}
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
