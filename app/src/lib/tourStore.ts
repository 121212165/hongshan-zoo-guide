// 游览状态机：游览全程的真实状态（任务4 + 阶段1闭环改造 + 阶段2多模态统一）
// 状态流转：draft（未生成）→ generated（已规划未开始）→ touring（游览中）→ completed（已出园）
// 节点状态：upcoming（待去）/ current（正在）/ visited（已去过）
//
// 阶段1改造：
//   - persona、collected、venueId 从 Home 局部 useState 迁入统一 store
//   - completeTour / arriveAt(last gate) 时自动生成 journal 手账数据
//   - 新增 collectAnimal / setPersona / setVenueId 统一 action
//   - 新增 replanTour 支持动态重规划（我累了/下雨了）
//
// 阶段2改造：
//   - recognizePhoto：拍照识别走导游消息流（trigger='vision'）
//   - askVoice：语音/预设问答走同一导游消息流（trigger='asr'/'manual'）
//   - 三入口「拍/说/到」最终都汇入 guideMessages
//
// 持久化：localStorage（key=zoo-tour-v2），刷新页面游览状态不丢。

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Plan, PlanInput } from './planner'
import { fmtClock } from './planner'
import type { Persona } from '@/data/animals'
import { recognizeFromPhoto, generateAskAnswer, type ArriveContext } from './guide'

export type TourStatus = 'draft' | 'generated' | 'touring' | 'completed'

export interface VisitedStop {
  nodeId: string
  arriveAt: number
  departAt?: number
  guideText?: string
}

export interface CollectedItem {
  animalId: string
  collectedAt: number
  nodeId?: string
  note?: string
}

export interface JournalEntry {
  createdAt: number
  startedAt: number
  completedAt: number
  totalWalkMin: number
  venueCount: number
  restCount: number
  visitedStops: VisitedStop[]
  collected: CollectedItem[]
  guideHighlights: Array<{ nodeId?: string; text: string; ts: number }>
  summaryNote?: string
}

export interface TourState {
  input: PlanInput | null
  plan: Plan | null
  status: TourStatus

  visitedIds: string[]
  currentId: string | null
  startedAt: number | null
  completedAt: number | null

  guideMessages: GuideMessage[]

  persona: Persona
  venueId: string
  collected: string[]
  collectedDetail: CollectedItem[]
  visitedStops: VisitedStop[]

  journal: JournalEntry | null

  replanNote?: string
}

export interface GuideMessage {
  id: string
  role: 'guide' | 'user' | 'system'
  text: string
  ts: number
  trigger?: 'auto' | 'manual' | 'arrive' | 'depart' | 'start' | 'complete' | 'vision' | 'asr'
  nodeId?: string
}

interface TourActions {
  setPlan: (input: PlanInput, plan: Plan, note?: string) => void
  resetPlan: () => void

  startTour: () => void
  arriveAt: (nodeId: string) => void
  departFrom: (nodeId: string) => void
  skipTo: (nodeId: string) => void
  completeTour: () => void

  replanTour: (newInput: PlanInput, newPlan: Plan, note: string) => void

  pushGuideMessage: (msg: Omit<GuideMessage, 'id' | 'ts'>) => string
  clearGuideMessages: () => void

  // 多模态入口：拍照识别 → 导游消息流
  recognizePhoto: (imageDataUrl: string, ctx: ArriveContext & { currentNodeId?: string | null }) => Promise<void>
  // 多模态入口：用户提问/语音识别后文本 → 导游消息流
  askQuestion: (question: string, ctx: ArriveContext & { currentNodeId?: string | null }, sourceTrigger?: 'manual' | 'asr') => Promise<void>

  setPersona: (p: Persona) => void
  setVenueId: (id: string) => void
  collectAnimal: (animalId: string, nodeId?: string, note?: string) => void
  uncollectAnimal: (animalId: string) => void

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
  persona: 'youth',
  venueId: 'gondwana',
  collected: [],
  collectedDetail: [],
  visitedStops: [],
  journal: null,
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function buildJournal(state: TourState): JournalEntry | null {
  if (!state.plan || !state.startedAt || !state.completedAt) return null

  const venueStops = state.plan.stops.filter((s) => s.kind === 'venue')
  const restStops = state.plan.stops.filter((s) => s.kind === 'rest' || s.kind === 'food')

  const guideHighlights = state.guideMessages
    .filter((m) => m.role === 'guide' && m.trigger === 'arrive' && m.text)
    .map((m) => ({ nodeId: m.nodeId, text: m.text, ts: m.ts }))

  return {
    createdAt: Date.now(),
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    totalWalkMin: Math.round(state.plan.totalWalk),
    venueCount: venueStops.length,
    restCount: restStops.length,
    visitedStops: state.visitedStops,
    collected: state.collectedDetail,
    guideHighlights,
    summaryNote: state.replanNote,
  }
}

export const useTourStore = create<TourState & TourActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPlan: (input, plan, note) => set({
        input,
        plan,
        status: 'generated',
        visitedIds: [],
        currentId: null,
        startedAt: null,
        completedAt: null,
        visitedStops: [],
        journal: null,
        replanNote: note,
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
        visitedStops: [],
        journal: null,
        replanNote: undefined,
      }),

      startTour: () => {
        const { plan, status } = get()
        if (!plan || status !== 'generated') return
        const firstNodeId = plan.stops[0]?.nodeId
        const now = Date.now()
        set({
          status: 'touring',
          currentId: firstNodeId ?? null,
          visitedIds: firstNodeId ? [firstNodeId] : [],
          startedAt: now,
          visitedStops: firstNodeId
            ? [{ nodeId: firstNodeId, arriveAt: now }]
            : [],
        })
      },

      arriveAt: (nodeId) => {
        const state = get()
        if (state.status !== 'touring' || !state.plan) return

        const visitedIds = state.visitedIds.includes(nodeId)
          ? state.visitedIds
          : [...state.visitedIds, nodeId]

        const now = Date.now()
        const prevStop = state.visitedStops.find((s) => s.nodeId === state.currentId)
        let visitedStops = state.visitedStops
        if (prevStop && !prevStop.departAt) {
          visitedStops = state.visitedStops.map((s) =>
            s.nodeId === state.currentId ? { ...s, departAt: now } : s
          )
        }
        if (!visitedStops.find((s) => s.nodeId === nodeId)) {
          visitedStops = [...visitedStops, { nodeId, arriveAt: now }]
        }

        set({ currentId: nodeId, visitedIds, visitedStops })

        const stops = state.plan.stops
        const isLast = stops[stops.length - 1]?.nodeId === nodeId
        if (isLast && stops[stops.length - 1]?.kind === 'gate') {
          const completedAt = Date.now()
          const finalState = { ...get(), completedAt, status: 'completed' as const, currentId: null }
          const journal = buildJournal(finalState)
          set({
            status: 'completed',
            completedAt,
            currentId: null,
            journal,
            guideMessages: [
              ...finalState.guideMessages,
              {
                id: uid(),
                role: 'guide',
                ts: completedAt,
                trigger: 'complete',
                text: '今天辛苦了。去手账看看今天的足迹和故事吧～',
              },
            ],
          })
        }
      },

      departFrom: (nodeId) => {
        const state = get()
        if (state.status !== 'touring') return
        if (state.currentId === nodeId) {
          const now = Date.now()
          const visitedStops = state.visitedStops.map((s) =>
            s.nodeId === nodeId && !s.departAt ? { ...s, departAt: now } : s
          )
          set({ currentId: null, visitedStops })
        }
      },

      skipTo: (nodeId) => {
        const state = get()
        if (state.status !== 'touring' || !state.plan) return
        const stops = state.plan.stops
        const targetIdx = stops.findIndex((s) => s.nodeId === nodeId)
        if (targetIdx < 0) return
        const skipped = stops.slice(0, targetIdx + 1).map((s) => s.nodeId)
        const visitedIds = Array.from(new Set([...state.visitedIds, ...skipped]))

        const now = Date.now()
        const visitedStops = [...state.visitedStops]
        for (const nid of skipped) {
          if (!visitedStops.find((s) => s.nodeId === nid)) {
            visitedStops.push({ nodeId: nid, arriveAt: now })
          }
        }

        set({ currentId: nodeId, visitedIds, visitedStops })
      },

      completeTour: () => {
        const state = get()
        if (state.status !== 'touring') return
        const allIds = state.plan?.stops.map((s) => s.nodeId) ?? []
        const completedAt = Date.now()

        const finalState: TourState = {
          ...state,
          status: 'completed',
          completedAt,
          currentId: null,
          visitedIds: allIds,
        }
        const journal = buildJournal(finalState)

        set({
          status: 'completed',
          completedAt,
          currentId: null,
          visitedIds: allIds,
          journal,
          guideMessages: [
            ...state.guideMessages,
            {
              id: uid(),
              role: 'guide',
              ts: completedAt,
              trigger: 'complete',
              text: '今天辛苦了。去手账看看今天的足迹和故事吧～',
            },
          ],
        })
      },

      replanTour: (newInput, newPlan, note) => {
        const state = get()
        if (state.status !== 'generated' && state.status !== 'touring') return
        set({
          input: newInput,
          plan: newPlan,
          replanNote: note,
          guideMessages: [
            ...state.guideMessages,
            {
              id: uid(),
              role: 'guide',
              ts: Date.now(),
              trigger: 'auto',
              text: note,
            },
          ],
        })
      },

      pushGuideMessage: (msg) => {
        const id = uid()
        const fullMsg: GuideMessage = { ...msg, id, ts: Date.now() }
        set((s) => {
          const updates: Partial<TourState> = { guideMessages: [...s.guideMessages, fullMsg] }
          if (msg.nodeId && msg.role === 'guide' && msg.trigger === 'arrive') {
            updates.visitedStops = s.visitedStops.map((vs) =>
              vs.nodeId === msg.nodeId ? { ...vs, guideText: msg.text } : vs
            )
          }
          return updates
        })
        return id
      },

      clearGuideMessages: () => set({ guideMessages: [] }),

      setPersona: (p) => set({ persona: p }),
      setVenueId: (id) => set({ venueId: id }),

      collectAnimal: (animalId, nodeId, note) => set((s) => {
        if (s.collected.includes(animalId)) return {}
        const now = Date.now()
        return {
          collected: [...s.collected, animalId],
          collectedDetail: [
            ...s.collectedDetail,
            { animalId, collectedAt: now, nodeId: nodeId ?? s.currentId ?? undefined, note },
          ],
        }
      }),

      uncollectAnimal: (animalId) => set((s) => ({
        collected: s.collected.filter((id) => id !== animalId),
        collectedDetail: s.collectedDetail.filter((c) => c.animalId !== animalId),
      })),

      recognizePhoto: async (imageDataUrl, ctx) => {
        const { pushGuideMessage } = get()
        pushGuideMessage({ role: 'user', text: '📷 正在识别照片…', trigger: 'vision', nodeId: ctx.currentNodeId ?? undefined })
        try {
          const { userDisplay, guideText, citations } = await recognizeFromPhoto(imageDataUrl, ctx)
          set((s) => {
            const msgs = [...s.guideMessages]
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'user' && last.text.includes('正在识别')) {
              msgs[msgs.length - 1] = { ...last, text: userDisplay }
            } else {
              msgs.push({ id: uid(), role: 'user', text: userDisplay, ts: Date.now(), trigger: 'vision', nodeId: ctx.currentNodeId ?? undefined })
            }
            msgs.push({
              id: uid(),
              role: 'guide',
              text: guideText + (citations.length ? `\n\n来源：${citations.join('、')}` : ''),
              ts: Date.now(),
              trigger: 'vision',
              nodeId: ctx.currentNodeId ?? undefined,
            })
            return { guideMessages: msgs }
          })
        } catch (err) {
          console.warn('[tourStore] recognizePhoto failed:', err)
          pushGuideMessage({ role: 'guide', text: '拍照识别出了点小问题，你可以再试一次，或者直接问我。', trigger: 'vision', nodeId: ctx.currentNodeId ?? undefined })
        }
      },

      askQuestion: async (question, ctx, sourceTrigger = 'manual') => {
        const { pushGuideMessage } = get()
        const displayQ = sourceTrigger === 'asr' ? `🎤 ${question}` : question
        pushGuideMessage({ role: 'user', text: displayQ, trigger: sourceTrigger, nodeId: ctx.currentNodeId ?? undefined })
        try {
          const { text, citations } = await generateAskAnswer(question, ctx)
          pushGuideMessage({
            role: 'guide',
            text: text + (citations.length ? `\n\n来源：${citations.join('、')}` : ''),
            trigger: sourceTrigger,
            nodeId: ctx.currentNodeId ?? undefined,
          })
        } catch (err) {
          console.warn('[tourStore] askQuestion failed:', err)
          pushGuideMessage({ role: 'guide', text: '这个问题我暂时答不上来，换个问题试试？', trigger: sourceTrigger, nodeId: ctx.currentNodeId ?? undefined })
        }
      },

      reset: () => set({ ...initialState, guideMessages: [] }),
    }),
    {
      name: 'zoo-tour-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        input: s.input,
        plan: s.plan,
        status: s.status,
        visitedIds: s.visitedIds,
        currentId: s.currentId,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        persona: s.persona,
        venueId: s.venueId,
        collected: s.collected,
        collectedDetail: s.collectedDetail,
        visitedStops: s.visitedStops,
        journal: s.journal,
        replanNote: s.replanNote,
      }),
      version: 2,
      migrate: (persistedState: unknown, version) => {
        if (version < 2) {
          const old = persistedState as Record<string, unknown>
          return {
            ...initialState,
            ...old,
            persona: 'youth' as Persona,
            venueId: 'gondwana',
            collected: [],
            collectedDetail: [],
            visitedStops: [],
            journal: null,
          }
        }
        return persistedState as TourState
      },
    }
  )
)

export function selectStopState(nodeId: string, state: TourState): 'visited' | 'current' | 'upcoming' {
  if (state.currentId === nodeId) return 'current'
  if (state.visitedIds.includes(nodeId)) return 'visited'
  return 'upcoming'
}

export function selectNextStopId(state: TourState): string | null {
  if (!state.plan) return null
  const idx = state.plan.stops.findIndex((s) => s.nodeId === state.currentId)
  if (idx < 0 || idx >= state.plan.stops.length - 1) return null
  return state.plan.stops[idx + 1].nodeId
}
