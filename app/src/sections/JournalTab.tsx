// 游后 · 我的红山手账
import { animals, type Persona } from '@/data/animals'
import { nodeMap } from '@/data/poi'
import { fmtClock, type Plan } from '@/lib/planner'
import { Card, CardContent } from '@/components/ui/card'
import { Leaf, Footprints, BookOpen, PauseCircle } from 'lucide-react'

interface Props {
  plan: Plan | null
  collected: string[]
  persona: Persona
}

export default function JournalTab({ plan, collected }: Props) {
  const cards = animals.filter((a) => collected.includes(a.id))
  const venueCount = plan ? plan.stops.filter((s) => s.kind === 'venue').length : 0
  const restCount = plan ? plan.stops.filter((s) => s.kind === 'rest' || s.kind === 'food').length : 0

  if (!plan && cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
        <div className="text-5xl">📖</div>
        <div className="font-semibold">手账还是空的</div>
        <div className="text-sm text-muted-foreground max-w-56">先去「规划」生成一条路线，或在「陪逛」里收藏你遇见的故事</div>
      </div>
    )
  }

  const date = new Date()
  const dateStr = `${date.getMonth() + 1} 月 ${date.getDate()} 日`

  return (
    <div className="space-y-4 pb-24">
      {/* 今日红山 */}
      <Card className="border-0 shadow-sm bg-primary text-primary-foreground overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm opacity-80"><Leaf className="w-4 h-4" /> 今日红山 · {dateStr}</div>
          <p className="text-[15px] leading-relaxed">
            今天按自己的节奏逛了红山{venueCount > 0 ? `，走过 ${venueCount} 个场馆` : ''}
            {plan ? `，步行约 ${Math.round(plan.totalWalk)} 分钟` : ''}。
            {cards.length > 0
              ? `遇见了 ${cards.map((c) => `${c.emoji}${c.name}`).join('、')}，带回了 ${cards.length} 个故事。`
              : '故事还在路上。'}
            没有看到谁也不必遗憾——在这里，动物有不营业的权利，而我们有慢下来的自由。
          </p>
          <div className="text-xs opacity-70">任何生命的意义，都不在于被他人观赏。</div>
        </CardContent>
      </Card>

      {/* 数据行 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Footprints, label: '步行', value: plan ? `${Math.round(plan.totalWalk)} 分钟` : '—' },
          { icon: PauseCircle, label: '树荫休息', value: `${restCount} 次` },
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

      {/* 收集的故事 */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold px-1">遇见的朋友们</div>
          {cards.map((c) => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-3.5 flex gap-3 items-center">
                <div className="text-3xl">{c.emoji}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{c.name} <span className="text-xs font-normal text-muted-foreground">{c.species}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.facts[0]?.text}</div>
                </div>
                {c.memorial && <span className="text-xs text-muted-foreground">纪念</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 行程回顾 */}
      {plan && (
        <div className="space-y-2">
          <div className="text-sm font-semibold px-1">今日足迹</div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
                {plan.stops.map((s, i) => (
                  <span key={i} className="flex items-center">
                    <span className={`px-2 py-1 rounded-lg text-xs ${s.kind === 'venue' ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted text-muted-foreground'}`}>
                      {fmtClock(s.arriveMin)} {nodeMap[s.nodeId]?.name}
                    </span>
                    {i < plan.stops.length - 1 && <span className="text-muted-foreground mx-0.5">→</span>}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 方法论与声明 */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        本 Demo 由「内容活化 pipeline」驱动：散落的园方内容 → 动物个体档案卡 → 分众叙事。同一套方法可迁移给全国中小动物园、自然保护地与非遗馆。
        <br />参赛演示作品，数据为公开资料整理，非红山森林动物园官方产品。
      </div>
    </div>
  )
}
