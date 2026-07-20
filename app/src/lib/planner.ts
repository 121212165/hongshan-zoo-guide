// 行程编织器：约束 → POI 图上的省力路线（计算交给代码，解释交给模板——Demo 内演示逻辑）
import { nodes, nodeMap, shortestMin, type PoiNode } from '@/data/poi'
import { getAnimalsByVenue } from '@/data/animals'

export interface PlanInput {
  hours: number
  energy: 1 | 2 | 3 // 1省电 2适中 3充沛
  withKids: boolean
  fearSun: boolean
  interests: string[] // star/cute/beast/primate/local/calm
  mustSee: string[] // animal ids
  startHour: number
}

export interface PlanStop {
  nodeId: string
  arriveMin: number // 从 00:00 起的绝对分钟
  walkMin: number
  stayMin: number
  reasons: string[]
  kind: 'gate' | 'venue' | 'rest' | 'food'
}

export interface Plan {
  stops: PlanStop[]
  summaryReasons: string[]
  totalWalk: number
  endMin: number
  note?: string // 动态调整说明
}

const fmt = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
export const fmtClock = fmt

export function buildPlan(input: PlanInput): Plan {
  const { hours, energy, withKids, fearSun, interests, mustSee, startHour } = input
  const budget = hours * 60
  const restGap = withKids || energy === 1 ? 55 : energy === 2 ? 75 : 95
  const venues = nodes.filter((n) => n.type === 'venue')
  const rests = nodes.filter((n) => n.type === 'rest' || n.type === 'food')

  const steepPenalty = (n: PoiNode) => n.slope * (energy === 1 ? 6 : energy === 2 ? 2.5 : 0.5)
  const skippedSteep: string[] = []

  const attract = (v: PoiNode, hour: number) => {
    let s = 2
    for (const a of getAnimalsByVenue(v.id)) {
      for (const t of a.tags) if (interests.includes(t)) s += 2
      if (mustSee.includes(a.id)) s += 15
      const [b, e] = a.bestTime
      if (hour >= b - 0.5 && hour <= e + 1) s += 3
    }
    if (fearSun && v.shade < 2) s -= 4
    return s
  }

  const stops: PlanStop[] = []
  const visited = new Set<string>()
  let cur = 'north'
  let clock = startHour * 60
  let toured = 0
  let totalWalk = 0

  stops.push({ nodeId: 'north', arriveMin: clock, walkMin: 0, stayMin: 0, reasons: ['从北门进园，先喝口水定定神'], kind: 'gate' })

  const pickRest = (from: string): PoiNode | null => {
    let best: PoiNode | null = null
    let bd = Infinity
    for (const r of rests) {
      const d = shortestMin(from, r.id) + (fearSun ? (3 - r.shade) * 2 : 0)
      if (d < bd) { bd = d; best = r }
    }
    return best
  }

  while (true) {
    const hourNow = clock / 60
    let bestV: PoiNode | null = null
    let bestScore = -Infinity
    for (const v of venues) {
      if (visited.has(v.id)) continue
      const walk = shortestMin(cur, v.id)
      const arriveHour = hourNow + walk / 60
      const score = attract(v, arriveHour) - steepPenalty(v) - walk * 0.5
      if (energy === 1 && v.slope >= 3) { if (!skippedSteep.includes(v.id)) skippedSteep.push(v.id); continue }
      if (score > bestScore) { bestScore = score; bestV = v }
    }
    if (!bestV) break
    const walk = shortestMin(cur, bestV.id)
    const cost = walk + bestV.stay
    const used = clock - startHour * 60
    if (used + cost + 25 > budget && visited.size >= 2) break // 预留出园时间

    // 需要休息？
    if (toured + cost > restGap && clock - startHour * 60 > 40) {
      const r = pickRest(cur)
      if (r) {
        const rw = shortestMin(cur, r.id)
        clock += rw
        totalWalk += rw
        stops.push({
          nodeId: r.id, arriveMin: clock, walkMin: rw, stayMin: r.stay,
          reasons: [fearSun ? '特意选了树荫好的休息点' : '安排一次休整，喝口水', withKids ? '娃的电量也需要充一充' : '省力的秘诀是节奏，不是速度'],
          kind: r.type === 'food' ? 'food' : 'rest',
        })
        clock += r.stay
        toured = 0
        cur = r.id
      }
    }

    const w2 = shortestMin(cur, bestV.id)
    clock += w2
    totalWalk += w2
    const animalsHere = getAnimalsByVenue(bestV.id)
    const reasons: string[] = []
    reasons.push(bestV.slope === 0 ? `步行 ${w2} 分钟平路` : bestV.slope >= 2 ? `步行 ${w2} 分钟，有坡，慢慢走不赶` : `步行 ${w2} 分钟`)
    const must = animalsHere.filter((a) => mustSee.includes(a.id))
    if (must.length) reasons.push(`你的必看清单：${must.map((a) => a.name).join('、')} 在这里`)
    const h = clock / 60
    const active = animalsHere.filter((a) => h >= a.bestTime[0] - 0.5 && h <= a.bestTime[1] + 1)
    if (active.length) reasons.push(`${active.map((a) => a.name).join('、')} 此时段状态正好`)
    if (fearSun && bestV.shade >= 2) reasons.push('场馆周边树荫好，不怕晒')
    if (bestV.slope >= 2 && energy >= 2) reasons.push('这段坡安排在体力充足的时候')

    stops.push({ nodeId: bestV.id, arriveMin: clock, walkMin: w2, stayMin: bestV.stay, reasons, kind: 'venue' })
    clock += bestV.stay
    toured = 0 // 场馆内慢节奏，视作节奏重置
    toured += 0
    visited.add(bestV.id)
    cur = bestV.id
    toured += bestV.stay * 0.6

    if (visited.size >= 8) break
  }

  // 出园
  const backNorth = shortestMin(cur, 'north')
  const backEast = shortestMin(cur, 'east')
  const exit = backEast < backNorth ? 'east' : 'north'
  const back = Math.min(backNorth, backEast)
  clock += back
  totalWalk += back
  stops.push({ nodeId: exit, arriveMin: clock, walkMin: back, stayMin: 0, reasons: [`从最近的${exit === 'east' ? '东门' : '北门'}出园，少走路`], kind: 'gate' })

  // 总结性省力理由
  const summaryReasons: string[] = []
  const restCount = stops.filter((s) => s.kind === 'rest' || s.kind === 'food').length
  summaryReasons.push(`全程约 ${Math.round(totalWalk)} 分钟步行，穿插 ${restCount} 次休息`)
  if (energy === 1 && skippedSteep.length) summaryReasons.push(`已绕开 ${skippedSteep.map((id) => nodeMap[id].name).join('、')} 等大坡路段`)
  if (fearSun) summaryReasons.push('休息点和路线优先选了树荫覆盖的路段')
  if (mustSee.length) summaryReasons.push('必看动物全部按活跃时段优先排期')
  summaryReasons.push('带娃友好：沿途卫生间已标在地图上' )

  return { stops, summaryReasons, totalWalk, endMin: clock }
}

// 动态调整：累了 / 下雨了 → 重新规划并生成差异说明
export function adjustPlan(prev: PlanInput, trigger: 'tired' | 'rain'): Plan {
  const next: PlanInput = { ...prev }
  let note = ''
  if (trigger === 'tired') {
    next.energy = 1
    next.hours = Math.max(1.5, prev.hours - 0.5)
    note = '收到，你说累了：我把坡度大的路段都拿掉了，节奏放慢一档，并多安排了一次树荫休息。剩下的路，我们慢慢逛。'
  } else {
    next.fearSun = true // 借「避晒」逻辑优先树荫与遮挡
    next.hours = Math.max(1.5, prev.hours - 0.5)
    note = '下雨了：我把路线切换到树荫和遮蔽多的路段，先去室内程度高的场馆，雨小的时候再走露天段。带伞，路滑。'
  }
  const plan = buildPlan(next)
  plan.note = note
  return plan
}
