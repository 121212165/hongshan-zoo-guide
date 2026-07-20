// 游前 · 行程编织器（任务2：入园时间选择器 + 任务4：游览状态机联动）
import { useState } from 'react'
import { buildPlan, adjustPlan, fmtClock, type Plan, type PlanInput } from '@/lib/planner'
import { animals } from '@/data/animals'
import { nodeMap } from '@/data/poi'
import { getAnimalsByVenue } from '@/data/animals'
import ZooMap from '@/components/ZooMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { CloudRain, Footprints, Sparkles, MapPin, ChevronRight, Clock, CheckCheck, RotateCcw, Flag } from 'lucide-react'
import type { TourStatus } from '@/lib/tourStore'

const interestOptions = [
  { id: 'star', label: '网红明星' },
  { id: 'cute', label: '萌系治愈' },
  { id: 'beast', label: '猛兽野性' },
  { id: 'primate', label: '灵长家族' },
  { id: 'local', label: '本土原住民' },
  { id: 'calm', label: '安静佛系' },
]

const mustSeeOptions = animals.filter((a) => a.tags.includes('star') && !a.memorial)

// 任务2：入园时间选项（8:00-15:00，30 分钟步进）
const START_HOUR_OPTIONS: { value: number; label: string }[] = (() => {
  const opts: { value: number; label: string }[] = []
  for (let h = 8; h <= 15; h += 1) {
    opts.push({ value: h, label: `${String(h).padStart(2, '0')}:00` })
    if (h < 15) opts.push({ value: h + 0.5, label: `${String(h).padStart(2, '0')}:30` })
  }
  return opts
})()

interface Props {
  plan: Plan | null
  input: PlanInput
  onInput: (i: PlanInput) => void
  onPlan: (p: Plan) => void
  onGoExplore: (venueId: string) => void
  // 任务4：状态机联动
  status: TourStatus
  currentId: string | null
  visitedIds: string[]
  onReset: () => void
}

export default function PlannerTab({ plan, input, onInput, onPlan, onGoExplore, status, currentId, visitedIds, onReset }: Props) {
  const [adjusting, setAdjusting] = useState<'tired' | 'rain' | null>(null)

  const toggleInterest = (id: string) => {
    const has = input.interests.includes(id)
    onInput({ ...input, interests: has ? input.interests.filter((x) => x !== id) : [...input.interests, id] })
  }
  const toggleMust = (id: string) => {
    const has = input.mustSee.includes(id)
    onInput({ ...input, mustSee: has ? input.mustSee.filter((x) => x !== id) : [...input.mustSee, id] })
  }

  const generate = () => {
    onPlan(buildPlan(input))
    setAdjusting(null)
  }
  const adjust = (t: 'tired' | 'rain') => {
    const p = adjustPlan(input, t)
    onPlan(p)
    setAdjusting(t)
  }

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`
  // 时间 chips 用稍小一号，避免一行装不下
  const timeChip = (active: boolean) =>
    `px-2.5 py-1.5 rounded-full text-xs border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`

  const isTouring = status === 'touring'
  const isCompleted = status === 'completed'
  const isGenerated = status === 'generated'
  const isDraft = status === 'draft'

  // 节点状态判断
  const stopState = (nodeId: string): 'visited' | 'current' | 'upcoming' => {
    if (currentId === nodeId) return 'current'
    if (visitedIds.includes(nodeId)) return 'visited'
    return 'upcoming'
  }

  return (
    <div className="space-y-4 pb-32">
      {/* ============ 任务4：游览中状态横幅 ============ */}
      {isTouring && (
        <div className="rounded-xl bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold">🚶 游览中</div>
            <div className="text-[11px] opacity-90 mt-0.5">
              已到 {visitedIds.length} / {plan?.stops.length ?? 0} 站
              {currentId && <> · 现在在 {nodeMap[currentId]?.name}</>}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-primary hover:bg-white/90 rounded-full"
            onClick={onReset}
          >
            <RotateCcw className="w-3 h-3 mr-1" /> 重新规划
          </Button>
        </div>
      )}
      {isCompleted && (
        <div className="rounded-xl bg-green-100 border border-green-300 text-green-800 px-4 py-3 flex items-center gap-3">
          <CheckCheck className="w-5 h-5" />
          <div className="flex-1 text-sm font-semibold">游览完成，辛苦了</div>
          <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={onReset}>
            再来一次
          </Button>
        </div>
      )}

      {/* ============ 约束输入（仅 draft/generated 允许改） ============ */}
      {(isDraft || isGenerated) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">⏱ 可用时长</div>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((h) => (
                  <button key={h} className={chip(input.hours === h)} onClick={() => onInput({ ...input, hours: h })}>
                    {h} 小时
                  </button>
                ))}
              </div>
            </div>

            {/* ============ 任务2：入园时间选择器（8:00-15:00，30 分钟步进） ============ */}
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 入园时间
              </div>
              <div className="flex flex-wrap gap-1.5">
                {START_HOUR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={timeChip(input.startHour === opt.value)}
                    onClick={() => onInput({ ...input, startHour: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5">
                {input.startHour < 10 ? '🌱 早到可以多看几个馆，明星动物也都活跃' :
                 input.startHour < 12 ? '☀️ 上午场，活动量最好' :
                 input.startHour < 14 ? '🌤 下午场，部分动物会午休' :
                 '🌙 临近闭园，建议只看核心场馆'}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">🔋 今日体力</div>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((e) => (
                  <button key={e} className={chip(input.energy === e)} onClick={() => onInput({ ...input, energy: e })}>
                    {e === 1 ? '省电模式' : e === 2 ? '适中' : '精力充沛'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={input.withKids} onCheckedChange={(v) => onInput({ ...input, withKids: v })} /> 带娃同行
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={input.fearSun} onCheckedChange={(v) => onInput({ ...input, fearSun: v })} /> 怕晒
              </label>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">💚 想看什么</div>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((o) => (
                  <button key={o.id} className={chip(input.interests.includes(o.id))} onClick={() => toggleInterest(o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">⭐ 必看动物（可选）</div>
              <div className="flex flex-wrap gap-2">
                {mustSeeOptions.map((a) => (
                  <button key={a.id} className={chip(input.mustSee.includes(a.id))} onClick={() => toggleMust(a.id)}>
                    {a.emoji} {a.name}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full h-11 text-base rounded-xl" onClick={generate}>
              <Sparkles className="w-4 h-4 mr-2" /> {isGenerated ? '重新生成路线' : '生成我的红山路线'}
            </Button>
            {isGenerated && (
              <div className="text-xs text-center text-muted-foreground">
                路线已编好，去右下角点「开始游览」即可出发
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ 路线展示（generated/touring/completed 都可见） ============ */}
      {plan && (
        <>
          {/* 动态调整入口（仅 generated 时可用） */}
          {isGenerated && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl bg-white" onClick={() => adjust('tired')}>
                <Footprints className="w-4 h-4 mr-1" /> 我累了
              </Button>
              <Button variant="outline" size="sm" className="flex-1 rounded-xl bg-white" onClick={() => adjust('rain')}>
                <CloudRain className="w-4 h-4 mr-1" /> 下雨了
              </Button>
            </div>
          )}

          {plan.note && (
            <div className="rounded-xl bg-accent/20 border border-accent/50 px-4 py-3 text-sm leading-relaxed">
              🔄 {plan.note}
              {adjusting && <span className="block mt-1 text-xs text-muted-foreground">动态调整已生效，下面是新版路线。</span>}
            </div>
          )}

          {/* 省力设计说明 */}
          <Card className="border-0 shadow-sm bg-secondary/60">
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">🧭 这条路线的省力设计</div>
              <ul className="space-y-1 text-sm text-secondary-foreground">
                {plan.summaryReasons.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">✓</span>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ============ 任务4：开始游览按钮（仅 generated） ============ */}
          {isGenerated && (
            <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-center gap-3">
              <Flag className="w-5 h-5 text-primary" />
              <div className="flex-1 text-xs leading-snug">
                <div className="font-semibold text-primary">准备好出发了吗？</div>
                <div className="text-muted-foreground">点右下角浮动按钮「开始游览」，地图会跟着你的进度切换。</div>
              </div>
            </div>
          )}

          {/* ============ 地图：任务1 真实 Leaflet + 任务4 状态联动 ============ */}
          <ZooMap
            routeIds={plan.stops.map((s) => s.nodeId)}
            visitedIds={visitedIds}
            currentId={currentId ?? undefined}
          />

          {/* 时间线 */}
          <div className="space-y-0">
            {plan.stops.map((s, i) => {
              const n = nodeMap[s.nodeId]
              const venueAnimals = s.kind === 'venue' ? getAnimalsByVenue(s.nodeId) : []
              const isLast = i === plan.stops.length - 1
              const state = stopState(s.nodeId)
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <div className={`text-xs font-mono font-semibold ${state === 'current' ? 'text-primary' : state === 'visited' ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                      {fmtClock(s.arriveMin)}
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 transition-all ${
                      state === 'current' ? 'bg-accent ring-4 ring-accent/30' :
                      state === 'visited' ? 'bg-primary' :
                      s.kind === 'venue' ? 'bg-primary/30' : s.kind === 'gate' ? 'bg-[#8a5a2b]/70' : 'bg-accent/60'
                    }`} />
                    {!isLast && <div className={`w-px flex-1 my-1 ${state === 'visited' ? 'bg-primary/50' : 'bg-border'}`} />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${state === 'visited' ? 'text-muted-foreground' : ''}`}>{n.name}</span>
                      {s.stayMin > 0 && <span className="text-xs text-muted-foreground">约 {s.stayMin} 分钟</span>}
                      {venueAnimals.length > 0 && <span className="text-sm">{venueAnimals.map((a) => a.emoji).join('')}</span>}
                      {/* 状态徽章 */}
                      {state === 'current' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/30 text-[#8a5f10] font-semibold">📍 现在这里</span>}
                      {state === 'visited' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">✓ 已到达</span>}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {s.reasons.map((r, j) => (
                        <div key={j} className="text-xs text-muted-foreground flex gap-1.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{r}</div>
                      ))}
                    </div>
                    {/* 操作按钮：陪逛 / 到这了 */}
                    <div className="mt-2 flex gap-2">
                      {s.kind === 'venue' && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={() => onGoExplore(s.nodeId)}>
                          到馆后点我陪逛 <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isTouring && state === 'current' && s.kind === 'venue' && (
                        <span className="text-[10px] text-[#8a5f10] self-center">📍 你正在这里</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 完成提示（仅 touring 显示） */}
          {isTouring && (
            <div className="text-center text-xs text-muted-foreground pt-2">
              到下一站时点浮动按钮「我到 X 了」即可推进
            </div>
          )}
        </>
      )}
    </div>
  )
}
