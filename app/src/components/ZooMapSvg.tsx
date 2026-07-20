// 手绘风 SVG 园区导览图（Leaflet 加载失败时的降级方案，保留原参赛演示逻辑）
import { nodes, edges, nodeMap } from '@/data/poi'

interface Props {
  routeIds?: string[]
  currentId?: string
  onPick?: (id: string) => void
  compact?: boolean
}

const typeStyle: Record<string, { fill: string; r: number }> = {
  gate: { fill: '#8a5a2b', r: 5 },
  venue: { fill: '#2f5d3a', r: 6 },
  rest: { fill: '#e8a33d', r: 4.5 },
  food: { fill: '#e0703d', r: 4.5 },
  toilet: { fill: '#7a8a99', r: 3.5 },
  view: { fill: '#5a8a6a', r: 4 },
}

export default function ZooMapSvg({ routeIds = [], currentId, onPick, compact }: Props) {
  const routeSet = new Set(routeIds)
  const pairs: [number, number, number, number][] = []
  for (let i = 0; i < routeIds.length - 1; i++) {
    const a = nodeMap[routeIds[i]]
    const b = nodeMap[routeIds[i + 1]]
    if (a && b) pairs.push([a.x, a.y, b.x, b.y])
  }
  return (
    <svg viewBox="0 0 100 100" className={`w-full ${compact ? 'h-44' : 'h-72'} rounded-xl bg-[#e9efe0]`} preserveAspectRatio="xMidYMid meet">
      <text x="50" y="6" textAnchor="middle" fontSize="3" fill="#999">SVG 降级模式（地图加载失败）</text>
      {[12, 30, 55, 78, 90].map((x, i) => (
        <circle key={i} cx={x} cy={88 - (i % 3) * 4} r={4 + (i % 2) * 2} fill="#d5e2c5" />
      ))}
      {edges.map(([a, b], i) => {
        const na = nodeMap[a]
        const nb = nodeMap[b]
        return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#c4cfb4" strokeWidth={0.8} />
      })}
      {pairs.map(([x1, y1, x2, y2], i) => (
        <line key={'r' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e8a33d" strokeWidth={1.6} strokeDasharray="2.5 1.8" strokeLinecap="round" />
      ))}
      {nodes.map((n) => {
        const s = typeStyle[n.type]
        const inRoute = routeSet.has(n.id)
        const isCurrent = currentId === n.id
        return (
          <g key={n.id} onClick={() => onPick?.(n.id)} className={onPick ? 'cursor-pointer' : ''}>
            {isCurrent && <circle cx={n.x} cy={n.y} r={s.r + 3.5} fill="none" stroke="#e8a33d" strokeWidth={1.2} />}
            <circle cx={n.x} cy={n.y} r={s.r} fill={s.fill} opacity={routeIds.length && !inRoute ? 0.35 : 1} stroke={inRoute ? '#e8a33d' : 'none'} strokeWidth={1.4} />
            <text x={n.x} y={n.y - s.r - 1.6} textAnchor="middle" fontSize={3.2} fill="#2c3a2e" fontWeight={inRoute || isCurrent ? 700 : 400}>
              {n.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
