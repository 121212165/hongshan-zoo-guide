// 红山真实地图：基于 react-leaflet + 高德瓦片
// - POI 节点用真实 lat/lng（WGS-84 存储 → GCJ-02 渲染）
// - 路线 polyline 分段着色（已走过实线 / 待走虚线 / 当前段高亮）
// - 当前节点用脉冲 marker；点击 marker 触发 onPick
// - 自动 pan 到 currentId（useMap + flyTo）
// - Leaflet 加载失败 → 降级到原 SVG 模式（保留 fallback）

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { nodes, nodeMap, poiLatLng, ZOO_CENTER, ZOO_BOUNDS, type PoiNode, type PoiType } from '@/data/poi'

// 降级 SVG 渲染（Leaflet 失败时用）
import SvgFallback from './ZooMapSvg'

export interface ZooMapProps {
  routeIds?: string[]
  visitedIds?: string[] // 已走过的节点（实线 + 淡色 marker）
  currentId?: string // 当前节点（脉冲 marker + 自动 pan）
  onPick?: (id: string) => void
  compact?: boolean
}

// 各类型 POI 的颜色 + emoji
const TYPE_META: Record<PoiType, { color: string; emoji: string; r: number }> = {
  gate:   { color: '#8a5a2b', emoji: '🚪', r: 8 },
  venue:  { color: '#2f5d3a', emoji: '📍', r: 10 },
  rest:   { color: '#e8a33d', emoji: '☕', r: 7 },
  food:   { color: '#e0703d', emoji: '🍴', r: 7 },
  toilet: { color: '#7a8a99', emoji: '🚻', r: 6 },
  view:   { color: '#5a8a6a', emoji: '👁', r: 7 },
}

// 自定义 divIcon（HTML+CSS marker，比默认 icon 灵活）
function buildIcon(n: PoiNode, opts: { inRoute: boolean; isCurrent: boolean; isVisited: boolean; dim: boolean }): L.DivIcon {
  const meta = TYPE_META[n.type]
  const size = meta.r * 2
  const ring = opts.isCurrent
    ? `<div class="zoo-pulse-ring" style="border-color:${meta.color}"></div>`
    : ''
  const opacity = opts.dim ? 0.45 : 1
  const labelColor = opts.isCurrent ? meta.color : '#2c3a2e'
  const labelWeight = opts.inRoute || opts.isCurrent ? 700 : 400
  return L.divIcon({
    className: 'zoo-marker',
    html: `
      <div class="zoo-marker-inner" style="opacity:${opacity}">
        ${ring}
        <div class="zoo-marker-dot" style="width:${size}px;height:${size}px;background:${meta.color};border:${opts.inRoute || opts.isCurrent ? '2px solid #e8a33d' : '2px solid #fff'};box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>
        <div class="zoo-marker-label" style="color:${labelColor};font-weight:${labelWeight}">${n.name}</div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 自动 pan 到 currentId（react-leaflet 推荐 useMap 模式）
function FlyToCurrent({ currentId }: { currentId?: string }) {
  const map = useMap()
  useEffect(() => {
    if (!currentId) return
    const n = nodeMap[currentId]
    if (!n) return
    const target = poiLatLng(n)
    map.flyTo(target, 17, { duration: 1.0, easeLinearity: 0.25 })
  }, [currentId, map])
  return null
}

// 加载失败时切到 SVG（用 ErrorBoundary-like 状态控制）
function ZooMapInner(props: ZooMapProps): React.ReactElement {
  const { routeIds = [], visitedIds = [], currentId, onPick, compact } = props
  const [loadError, setLoadError] = useState(false)

  const routeSet = useMemo(() => new Set(routeIds), [routeIds])
  const visitedSet = useMemo(() => new Set(visitedIds), [visitedIds])

  // 路线 polyline 坐标 + 段状态
  const routeSegments = useMemo(() => {
    if (routeIds.length < 2) return []
    const segs: { coords: [number, number][]; state: 'visited' | 'current' | 'upcoming' }[] = []
    for (let i = 0; i < routeIds.length - 1; i++) {
      const a = nodeMap[routeIds[i]]
      const b = nodeMap[routeIds[i + 1]]
      if (!a || !b) continue
      const aVisited = visitedSet.has(a.id)
      const bVisited = visitedSet.has(b.id)
      const state: 'visited' | 'current' | 'upcoming' = aVisited && bVisited
        ? 'visited'
        : aVisited && !bVisited
          ? 'current'
          : 'upcoming'
      segs.push({ coords: [poiLatLng(a), poiLatLng(b)], state })
    }
    return segs
  }, [routeIds, visitedSet])

  if (loadError) {
    return <SvgFallback routeIds={routeIds} currentId={currentId} onPick={onPick} compact={compact} />
  }

  const center = currentId && nodeMap[currentId] ? poiLatLng(nodeMap[currentId]) : ZOO_CENTER

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border/40 ${compact ? 'h-44' : 'h-72'}`}>
      <MapContainer
        center={center}
        zoom={16}
        minZoom={15}
        maxZoom={18}
        zoomControl={false}
        attributionControl={false}
        maxBounds={L.latLngBounds(ZOO_BOUNDS[0], ZOO_BOUNDS[1]).pad(0.5)}
        className="w-full h-full"
      >
        <TileLayer
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={['1', '2', '3', '4']}
          attribution='&copy; 高德地图'
          crossOrigin
          eventHandlers={{
            error: () => setLoadError(true),
          }}
        />
        {/* 路线 polyline 分段 */}
        {routeSegments.map((seg, i) => (
          <Polyline
            key={`seg-${i}`}
            positions={seg.coords}
            pathOptions={
              seg.state === 'visited'
                ? { color: '#2f5d3a', weight: 5, opacity: 0.9, dashArray: undefined, lineCap: 'round' }
                : seg.state === 'current'
                  ? { color: '#e8a33d', weight: 6, opacity: 1, dashArray: '1 6', lineCap: 'round' }
                  : { color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '6 8', lineCap: 'round' }
            }
          />
        ))}
        {/* 全部节点 marker */}
        {nodes.map((n) => {
          const inRoute = routeSet.has(n.id)
          const isCurrent = currentId === n.id
          const isVisited = visitedSet.has(n.id)
          const dim = routeIds.length > 0 && !inRoute && !isCurrent
          return (
            <Marker
              key={n.id}
              position={poiLatLng(n)}
              icon={buildIcon(n, { inRoute, isCurrent, isVisited, dim })}
              zIndexOffset={isCurrent ? 1000 : inRoute ? 500 : 0}
              eventHandlers={{
                click: () => onPick?.(n.id),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{n.name}</div>
                  {n.desc && <div className="text-xs text-muted-foreground mt-0.5">{n.desc}</div>}
                  {inRoute && <div className="text-xs text-primary mt-1">📍 路线上的点</div>}
                  {isVisited && <div className="text-xs text-green-600 mt-0.5">✓ 已游览</div>}
                  {onPick && <div className="text-[10px] text-muted-foreground mt-1">点击选择此节点</div>}
                </div>
              </Popup>
            </Marker>
          )
        })}
        <FlyToCurrent currentId={currentId} />
      </MapContainer>
      {/* 角标：地图数据来源 */}
      <div className="absolute bottom-1 right-1 text-[9px] bg-white/70 backdrop-blur px-1.5 py-0.5 rounded">
        高德地图 · 红山导览
      </div>
    </div>
  )
}

// 用 React.Component 包装一下捕获运行时错误，失败时降级到 SVG
import { Component } from 'react'
class ZooMapBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: unknown) {
    console.warn('[ZooMap] Leaflet 渲染失败，降级到 SVG:', err)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default function ZooMap(props: ZooMapProps) {
  return (
    <ZooMapBoundary fallback={<SvgFallback {...props} />}>
      <ZooMapInner {...props} />
    </ZooMapBoundary>
  )
}
