// 游览状态机：游览全程的真实状态（任务4）
// 状态流转：draft（未生成）→ generated（已规划未开始）→ touring（游览中）→ completed（已出园）
// 节点状态：upcoming（待去）/ current（正在）/ visited（已去过）
//
// 这是「真实落地」改造的核心：UI 的「到这了」按钮、地图的 current/visited 联动、
// 导游 Agent 的主动讲解触发，全部依赖这个 store。
//
// 持久化：localStorage（key=zoo-tour-v1），刷新页面游览状态不丢。

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Plan, PlanInput } from './planner'
import { fmtClock } from './planner'

export type TourStatus = 'draft' | 'generated' | 'touring' | 'completed'

export interface TourState {
  // 输入与规划
  input: PlanInput | null
  plan: Plan | null
  status: TourStatus

  // 节点状态：来自 plan.stops 的 nodeId 顺序
  visitedIds: string[] // 已走过的（按到达顺序）
  currentId: string | null // 当前所在节点
  startedAt: number | null // 进入 touring 状态的时间戳（ms）
  completedAt: number | null // 进入 completed 状态的时间戳

  // 历次导游消息（任务3：导游抽屉展示用）
  guideMessages: GuideMessage[]
}

export interface GuideMessage {
  id: string
  role: 'guide' | 'user' | 'system'
  text: string
  ts: number
  trigger?: 'auto' | 'manual' | 'arrive' | 'depart' | 'start' | 'complete'
  nodeId?: string // 关联的 POI 节点
}

interface TourActions {
  // 规划阶段
  setPlan: (input: PlanInput, plan: Plan) => void
  resetPlan: () => void

  // 游览阶段
  startTour: () => void
  arriveAt: (nodeId: string) => void // 用户点「到这了」
  departFrom: (nodeId: string) => void // 离开节点
  skipTo: (nodeId: string) => void // 跳到任意节点
  completeTour: () => void

  // 导游消息
  pushGuideMessage: (msg: Omit<GuideMessage, 'id' | 'ts'>) => string
  clearGuideMessages: () => void

  // 完全重置（回 draft）
  reset: () => void
}

const initialState: TourState = {
  input: null,
  plan: null,
  status: 'draft',
  visitedIds: [],
  currentId: null,
  startedAt: null,
  completedAt: null,
  guideMessages: [],
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const useTourStore = create<TourState & TourActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPlan: (input, plan) => set({
        input,
        plan,
        status: 'generated',
        visitedIds: [],
        currentId: null,
        startedAt: null,
        completedAt: null,
        guideMessages: [
          {
            id: uid(),
            role: 'guide',
            ts: Date.now(),
            trigger: 'start',
            text: `路线已编好：${plan.stops.length} 站，预计 ${fmtClock(plan.endMin)} 出园。点「开始游览」我就陪你走起来。`,
          },
        ],
      }),

      resetPlan: () => set({
        plan: null,
        status: 'draft',
        visitedIds: [],
        currentId: null,
        startedAt: null,
        completedAt: null,
      }),

      startTour: () => {
        const { plan, status } = get()
        if (!plan || status !== 'generated') return
        const firstNodeId = plan.stops[0]?.nodeId
        set({
          status: 'touring',
          currentId: firstNodeId ?? null,
          visitedIds: firstNodeId ? [firstNodeId] : [],
          startedAt: Date.now(),
        })
      },

      arriveAt: (nodeId) => {
        const state = get()
        if (state.status !== 'touring' || !state.plan) return
        const visitedIds = state.visitedIds.includes(nodeId)
          ? state.visitedIds
          : [...state.visitedIds, nodeId]
        set({ currentId: nodeId, visitedIds })

        // 自动判断是否完成（这是最后一个节点）
        const stops = state.plan.stops
        const isLast = stops[stops.length - 1]?.nodeId === nodeId
        if (isLast && stops[stops.length - 1]?.kind === 'gate') {
          set({ status: 'completed', completedAt: Date.now(), currentId: null })
        }
      },

      departFrom: (nodeId) => {
        const state = get()
        if (state.status !== 'touring') return
        // 离开节点：currentId 设为 null，等待下个 arriveAt
        if (state.currentId === nodeId) {
          set({ currentId: null })
        }
      },

      skipTo: (nodeId) => {
        const state = get()
        if (state.status !== 'touring' || !state.plan) return
        // 跳到任意节点：标记中间的节点为已访问
        const stops = state.plan.stops
        const targetIdx = stops.findIndex((s) => s.nodeId === nodeId)
        if (targetIdx < 0) return
        const skipped = stops.slice(0, targetIdx + 1).map((s) => s.nodeId)
        const visitedIds = Array.from(new Set([...state.visitedIds, ...skipped]))
        set({ currentId: nodeId, visitedIds })
      },

      completeTour: () => {
        const state = get()
        if (state.status !== 'touring') return
        // 全部节点标记为已访问
        const allIds = state.plan?.stops.map((s) => s.nodeId) ?? []
        set({
          status: 'completed',
          completedAt: Date.now(),
          currentId: null,
          visitedIds: allIds,
        })
      },

      pushGuideMessage: (msg) => {
        const id = uid()
        const fullMsg: GuideMessage = { ...msg, id, ts: Date.now() }
        set((s) => ({ guideMessages: [...s.guideMessages, fullMsg] }))
        return id
      },

      clearGuideMessages: () => set({ guideMessages: [] }),

      reset: () => set({ ...initialState, guideMessages: [] }),
    }),
    {
      name: 'zoo-tour-v1',
      storage: createJSONStorage(() => localStorage),
      // 只持久化关键状态，不持久化导游消息（消息太多撑爆 localStorage）
      partialize: (s) => ({
        input: s.input,
        plan: s.plan,
        status: s.status,
        visitedIds: s.visitedIds,
        currentId: s.currentId,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }),
    }
  )
)

// 选择器：根据当前 currentId 计算 visited/current/upcoming 三类
export function selectStopState(nodeId: string, state: TourState): 'visited' | 'current' | 'upcoming' {
  if (state.currentId === nodeId) return 'current'
  if (state.visitedIds.includes(nodeId)) return 'visited'
  return 'upcoming'
}

// 选择器：根据 currentId 找下一个节点
export function selectNextStopId(state: TourState): string | null {
  if (!state.plan) return null
  const idx = state.plan.stops.findIndex((s) => s.nodeId === state.currentId)
  if (idx < 0 || idx >= state.plan.stops.length - 1) return null
  return state.plan.stops[idx + 1].nodeId
}
