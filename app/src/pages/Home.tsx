// 红山朋友 · 陪逛 Agent（参赛演示 Demo）
// 任务4 改造：游览状态从 useState 改为 useTourStore（持久化 + 状态机）
// 任务3：右下角浮动 GuidePanel（红山朋友导游）
import { useState } from 'react'
import PlannerTab from '@/sections/PlannerTab'
import ExploreTab from '@/sections/ExploreTab'
import JournalTab from '@/sections/JournalTab'
import GuidePanel from '@/components/GuidePanel'
import { useTourStore } from '@/lib/tourStore'
import type { PlanInput } from '@/lib/planner'
import type { Persona } from '@/data/animals'
import { Route, Compass, BookOpen, Leaf } from 'lucide-react'

type Tab = 'plan' | 'explore' | 'journal'

export default function Home() {
  const [tab, setTab] = useState<Tab>('plan')

  // 从 store 拿状态（注意：选择器必须返回稳定引用，不能用 filter/map 派生新数组）
  const status = useTourStore((s) => s.status)
  const plan = useTourStore((s) => s.plan)
  const input = useTourStore((s) => s.input)
  const setPlan = useTourStore((s) => s.setPlan)
  const resetPlan = useTourStore((s) => s.resetPlan)
  const currentId = useTourStore((s) => s.currentId)
  const visitedIds = useTourStore((s) => s.visitedIds)

  // 局部 UI 状态：persona + 当前场馆 + collected（ExploreTab 用）
  // collected 用 useState 而非 store 派生，避免每次 render 产生新数组引用触发无限渲染
  const [persona, setPersona] = useState<Persona>('youth')
  const [venueId, setVenueId] = useState('gondwana')
  const [collected, setCollected] = useState<string[]>([])

  // 默认 input（首次进入用）
  const defaultInput: PlanInput = {
    hours: 3,
    energy: 2,
    withKids: true,
    fearSun: true,
    interests: ['star', 'cute'],
    mustSee: ['dudu', 'xingren'],
    startHour: 9,
  }
  const currentInput: PlanInput = input ?? defaultInput

  // PlannerTab 改 input 时同步到 store（draft 状态下）
  const handleInput = (next: PlanInput) => {
    // 只在 draft 或 generated 阶段允许改 input
    if (status === 'draft' || status === 'generated') {
      // 直接写到 store 的 input 字段
      useTourStore.setState({ input: next })
    }
  }
  // PlannerTab 生成路线时调
  const handlePlan = (p: typeof plan) => {
    if (p) setPlan(currentInput, p)
  }

  const goExplore = (vid: string) => {
    setVenueId(vid)
    setTab('explore')
  }

  // 收藏动物到手账（ExploreTab 用，与原行为一致）
  const collect = (id: string) => setCollected((c) => (c.includes(id) ? c : [...c, id]))

  // 游览中切换 tab：只能 plan / explore / journal（plan 标签显示「我的路线」）
  const tabs: { id: Tab; label: string; icon: typeof Route }[] = [
    { id: 'plan', label: status === 'touring' ? '路线' : '规划', icon: Route },
    { id: 'explore', label: '陪逛', icon: Compass },
    { id: 'journal', label: '手账', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
        {/* 顶栏 */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold leading-tight">红山朋友</div>
              <div className="text-[10px] text-muted-foreground leading-tight">陪你按自己的方式，逛出自己的红山</div>
            </div>
            {/* 状态徽章 */}
            <span className={`ml-auto text-[10px] px-2 py-1 rounded-full border ${
              status === 'touring' ? 'bg-primary/15 text-primary border-primary/40' :
              status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
              status === 'generated' ? 'bg-accent/20 text-[#8a5f10] border-accent/40' :
              'bg-muted text-muted-foreground border-border'
            }`}>
              {status === 'draft' ? '演示模式' :
               status === 'generated' ? '路线已编好' :
               status === 'touring' ? `游览中 · ${visitedIds.length}/${plan?.stops.length ?? 0}` :
               '已完成'}
            </span>
          </div>
        </header>

        {/* 内容 */}
        <main className="flex-1 px-4 pt-4">
          {tab === 'plan' && (
            <PlannerTab
              plan={plan}
              input={currentInput}
              onInput={handleInput}
              onPlan={handlePlan}
              onGoExplore={goExplore}
              status={status}
              currentId={currentId}
              visitedIds={visitedIds}
              onReset={() => resetPlan()}
            />
          )}
          {tab === 'explore' && (
            <ExploreTab
              venueId={status === 'touring' && currentId ? currentId : venueId}
              onVenue={setVenueId}
              persona={persona}
              onPersona={setPersona}
              collected={collected}
              onCollect={collect}
            />
          )}
          {tab === 'journal' && <JournalTab plan={plan} collected={collected} persona={persona} />}
        </main>

        {/* 底部 Tab */}
        <nav className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur border-t border-border flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${tab === t.id ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* 浮动导游面板（任务3） */}
        <GuidePanel persona={persona} />
      </div>
    </div>
  )
}
