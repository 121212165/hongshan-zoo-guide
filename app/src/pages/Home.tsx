// 红山朋友 · 陪逛 Agent（参赛演示 Demo）
// 阶段1 闭环改造：persona/collected/venueId 统一迁入 tourStore，消除局部状态分裂
import { useState, useCallback } from 'react'
import PlannerTab from '@/sections/PlannerTab'
import ExploreTab from '@/sections/ExploreTab'
import JournalTab from '@/sections/JournalTab'
import GuidePanel from '@/components/GuidePanel'
import { useTourStore } from '@/lib/tourStore'
import { adjustPlan, type PlanInput } from '@/lib/planner'
import { Route, Compass, BookOpen, Leaf } from 'lucide-react'

type Tab = 'plan' | 'explore' | 'journal'

export default function Home() {
  const [tab, setTab] = useState<Tab>('plan')

  const status = useTourStore((s) => s.status)
  const plan = useTourStore((s) => s.plan)
  const input = useTourStore((s) => s.input)
  const setPlan = useTourStore((s) => s.setPlan)
  const resetPlan = useTourStore((s) => s.resetPlan)
  const currentId = useTourStore((s) => s.currentId)
  const visitedIds = useTourStore((s) => s.visitedIds)

  const persona = useTourStore((s) => s.persona)
  const venueId = useTourStore((s) => s.venueId)
  const collected = useTourStore((s) => s.collected)
  const setPersona = useTourStore((s) => s.setPersona)
  const setVenueId = useTourStore((s) => s.setVenueId)
  const collectAnimal = useTourStore((s) => s.collectAnimal)

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

  const handleInput = (next: PlanInput) => {
    if (status === 'draft' || status === 'generated') {
      useTourStore.setState({ input: next })
    }
  }
  const handlePlan = (p: typeof plan) => {
    if (p) setPlan(currentInput, p)
  }

  const goExplore = (vid: string) => {
    setVenueId(vid)
    setTab('explore')
  }

  const collect = (id: string) => collectAnimal(id)

  const handleReplan = useCallback((trigger: 'tired' | 'rain') => {
    if (!currentInput) return
    const adjusted = adjustPlan(currentInput, trigger, currentId ?? undefined, visitedIds)
    if (status === 'touring') {
      useTourStore.getState().replanTour(
        { ...currentInput, energy: trigger === 'tired' ? 1 : currentInput.energy, fearSun: trigger === 'rain' ? true : currentInput.fearSun },
        adjusted,
        adjusted.note ?? ''
      )
    } else {
      setPlan(currentInput, adjusted, adjusted.note)
    }
  }, [currentInput, currentId, status, setPlan, visitedIds])



  const activeTab: Tab = status === 'completed' ? 'journal' : status === 'touring' ? 'explore' : tab
  const tabs: { id: Tab; label: string; icon: typeof Route }[] = [
    { id: 'plan', label: status === 'touring' ? '路线' : '规划', icon: Route },
    { id: 'explore', label: '陪逛', icon: Compass },
    { id: 'journal', label: '手账', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold leading-tight">红山朋友</div>
              <div className="text-[10px] text-muted-foreground leading-tight">陪你按自己的方式，逛出自己的红山</div>
            </div>
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

        <main className="flex-1 px-4 pt-4">
          {activeTab === 'plan' && (
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
              onReplan={handleReplan}
            />
          )}
          {activeTab === 'explore' && (
            <ExploreTab
              venueId={status === 'touring' && currentId ? currentId : venueId}
              onVenue={setVenueId}
              persona={persona}
              onPersona={setPersona}
              collected={collected}
              onCollect={collect}
            />
          )}
          {activeTab === 'journal' && <JournalTab />}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-md mx-auto bg-white/95 backdrop-blur border-t border-border flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs transition-colors ${activeTab === t.id ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <GuidePanel />
      </div>
    </div>
  )
}


