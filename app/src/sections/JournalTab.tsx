// 游后 · 我的红山手账
// 阶段1闭环改造：从 tourStore 消费真实游览产物，不再只读 plan + collected props
import { animals } from '@/data/animals'
import { nodeMap } from '@/data/poi'
import { fmtClock } from '@/lib/planner'
import { useTourStore } from '@/lib/tourStore'
import { Card, CardContent } from '@/components/ui/card'
import { Leaf, Footprints, BookOpen, PauseCircle, MapPin, Sparkles } from 'lucide-react'

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} 分钟`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h} 小时${m > 0 ? ` ${m} 分钟` : ''}`
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function JournalTab() {
  const plan = useTourStore((s) => s.plan)
  const collected = useTourStore((s) => s.collected)
  const journal = useTourStore((s) => s.journal)
  const status = useTourStore((s) => s.status)
  const visitedIds = useTourStore((s) => s.visitedIds)
  const visitedStops = useTourStore((s) => s.visitedStops)
  const persona = useTourStore((s) => s.persona)
  const guideMessages = useTourStore((s) => s.guideMessages)

  const cards = animals.filter((a) => collected.includes(a.id))

  const effectivePlan = plan
  const effectiveVenueCount = journal
    ? journal.venueCount
    : effectivePlan
      ? effectivePlan.stops.filter((s) => s.kind === 'venue').length
      : 0
  const effectiveRestCount = journal
    ? journal.restCount
    : effectivePlan
      ? effectivePlan.stops.filter((s) => s.kind === 'rest' || s.kind === 'food').length
      : 0
  const effectiveWalkMin = journal?.totalWalkMin ?? (effectivePlan ? Math.round(effectivePlan.totalWalk) : 0)

  const isCompleted = status === 'completed'
  const isTouring = status === 'touring'

  if (!effectivePlan && cards.length === 0 && !isTouring) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
        <div className="text-5xl">📖</div>
        <div className="font-semibold">手账还是空的</div>
        <div className="text-sm text-muted-foreground max-w-56">先去「规划」生成一条路线，或在「陪逛」里收藏你遇见的故事</div>
      </div>
    )
  }

  const now = new Date()
  const dateStr = journal
    ? `${now.getMonth() + 1} 月 ${now.getDate()} 日`
    : `${now.getMonth() + 1} 月 ${now.getDate()} 日`

  const startTime = journal?.startedAt
  const endTime = journal?.completedAt
  const durationStr = startTime && endTime ? formatDuration(endTime - startTime) : null

  const arriveGuides = journal
    ? journal.guideHighlights.filter((m) => m.nodeId && nodeMap[m.nodeId]?.type === 'venue')
    : guideMessages.filter(
        (m) => m.role === 'guide' && m.trigger === 'arrive' && m.nodeId && nodeMap[m.nodeId]?.type === 'venue'
      )

  const personaLabel = persona === 'youth' ? '朋友模式' : persona === 'kid' ? '亲子模式' : '长辈模式'

  return (
    <div className="space-y-4 pb-24">
      {isCompleted && journal && (
        <div className="rounded-xl bg-green-100 border border-green-300 text-green-800 px-4 py-2.5 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>今天的红山回忆已自动整理到手账里了</span>
        </div>
      )}
      {isTouring && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 text-primary px-4 py-2.5 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>游览进行中，手账会随着你的脚步实时更新</span>
        </div>
      )}

      <Card className="border-0 shadow-sm bg-primary text-primary-foreground overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Leaf className="w-4 h-4" />
            今日红山 · {dateStr}
            {durationStr && <span className="ml-auto text-xs opacity-70">{formatTime(startTime!)}–{formatTime(endTime!)} · {durationStr}</span>}
          </div>
          <p className="text-[15px] leading-relaxed">
            {isCompleted
              ? `今天按自己的节奏逛了红山${effectiveVenueCount > 0 ? `，走过 ${effectiveVenueCount} 个场馆` : ''}${effectiveWalkMin > 0 ? `，步行约 ${effectiveWalkMin} 分钟` : ''}。`
              : isTouring
                ? `正在逛红山，已到 ${visitedIds.filter((id) => nodeMap[id]?.type === 'venue').length} 个场馆。`
                : `路线已编好，随时可以出发。`}
            {cards.length > 0
              ? `遇见了 ${cards.map((c) => `${c.emoji}${c.name}`).join('、')}，带回了 ${cards.length} 个故事。`
              : isCompleted ? '今天没有特意收藏谁，但每一步都是回忆。' : ''}
            {!isCompleted ? '' : '没有看到谁也不必遗憾——在这里，动物有不营业的权利，而我们有慢下来的自由。'}
          </p>
          <div className="text-xs opacity-70">
            任何生命的意义，都不在于被他人观赏。
            {journal?.summaryNote && <span className="block mt-1 opacity-90">🔄 {journal.summaryNote}</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Footprints, label: '步行', value: effectiveWalkMin > 0 ? `${effectiveWalkMin} 分钟` : '—' },
          { icon: PauseCircle, label: '树荫休息', value: `${effectiveRestCount} 次` },
          { icon: BookOpen, label: '收集故事', value: `${cards.length} 个` },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto text-primary mb-1" />
              <div className="text-sm font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cards.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold px-1">遇见的朋友们</div>
          {cards.map((c) => {
            const collectedItem = journal?.collected.find((ci) => ci.animalId === c.id)
            const collectedVenue = collectedItem?.nodeId ? nodeMap[collectedItem.nodeId]?.name : null
            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="p-3.5 flex gap-3 items-center">
                  <div className="text-3xl">{c.emoji}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {c.name} <span className="text-xs font-normal text-muted-foreground">{c.species}</span>
                      {collectedVenue && <span className="text-[10px] text-muted-foreground ml-1">· 在{collectedVenue}遇见</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.facts[0]?.text}</div>
                  </div>
                  {c.memorial && <span className="text-xs text-muted-foreground">纪念</span>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {arriveGuides.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold px-1">红山朋友的讲解</div>
          <div className="space-y-2">
            {arriveGuides.slice(-6).map((m) => {
              const node = m.nodeId ? nodeMap[m.nodeId] : null
              if (!node) return null
              return (
                <Card key={`${m.nodeId ?? ' '}-${m.ts}`} className="border-0 shadow-sm">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-1">
                      <MapPin className="w-3 h-3" /> {node.name}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{m.text}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {effectivePlan && (
        <div className="space-y-2">
          <div className="text-sm font-semibold px-1">
            {isCompleted ? '今日足迹' : isTouring ? `足迹（已走 ${visitedIds.length}/${effectivePlan.stops.length} 站）` : '计划路线'}
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
                {effectivePlan.stops.map((s, i) => {
                  const isVisited = visitedIds.includes(s.nodeId)
                  const isCurrent = false
                  const stop = visitedStops.find((vs) => vs.nodeId === s.nodeId)
                  return (
                    <span key={i} className="flex items-center">
                      <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-accent text-[#8a5f10] font-semibold ring-2 ring-accent/30'
                          : isVisited
                            ? 'bg-primary/10 text-primary font-semibold'
                            : s.kind === 'venue'
                              ? 'bg-muted text-muted-foreground'
                              : s.kind === 'gate'
                                ? 'bg-[#8a5a2b]/10 text-[#8a5a2b]'
                                : 'bg-accent/30 text-[#8a5f10]'
                      }`}>
                        {stop ? formatTime(stop.arriveAt) : fmtClock(s.arriveMin)} {nodeMap[s.nodeId]?.name}
                        {isVisited && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      {i < effectivePlan.stops.length - 1 && <span className="text-muted-foreground mx-0.5">→</span>}
                    </span>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-primary/40 bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        讲解风格：{personaLabel}。本 Demo 由「内容活化 pipeline」驱动：散落的园方内容 → 动物个体档案卡 → 分众叙事。同一套方法可迁移给全国中小动物园、自然保护地与非遗馆。
        <br />参赛演示作品，数据为公开资料整理，非红山森林动物园官方产品。
      </div>
    </div>
  )
}


