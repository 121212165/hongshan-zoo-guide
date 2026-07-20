// 园区 POI 图（参赛演示数据，基于红山森林动物园公开导览图建模）
// 节点 = 场馆/设施；边 = 步行分钟；节点属性含坡度、树荫——「省力」可量化的基础
//
// 坐标系说明：
//   - lat/lng 用 WGS-84（GPS 真实坐标，便于未来接 GPS 定位）
//   - 渲染高德瓦片时通过 wgs84ToGcj02() 转成 GCJ-02（高德/腾讯国内坐标系）
//   - x/y 是原 SVG 模式遗留的百分比坐标，仅在 Leaflet 加载失败时降级使用
// 坐标为依据红山森林动物园公开导览图 + 卫星图估算，仅供赛事演示，非精确地理测绘

export type PoiType = 'gate' | 'venue' | 'rest' | 'food' | 'toilet' | 'view'

export interface PoiNode {
  id: string
  name: string
  type: PoiType
  lat: number // WGS-84 纬度
  lng: number // WGS-84 经度
  x: number // 旧 SVG 模式百分比坐标（降级用）
  y: number
  slope: 0 | 1 | 2 | 3 // 周边坡度（0平 3陡）
  shade: 0 | 1 | 2 | 3 // 树荫覆盖（0无 3密）
  stay: number // 建议停留分钟
  desc?: string
}

// 红山森林动物园中心点（WGS-84，约玄武区北苑街道红山南侧）
export const ZOO_CENTER: [number, number] = [32.1105, 118.8365]
export const ZOO_BOUNDS: [[number, number], [number, number]] = [
  [32.1050, 118.8280], // SW
  [32.1160, 118.8440], // NE
]

export const nodes: PoiNode[] = [
  { id: 'north',   name: '北门',           type: 'gate',   lat: 32.1138, lng: 118.8342, x: 50, y: 6,  slope: 0, shade: 2, stay: 0,  desc: '红山主入口' },
  { id: 'lake',    name: '中心湖广场',      type: 'view',   lat: 32.1115, lng: 118.8358, x: 50, y: 24, slope: 0, shade: 1, stay: 10, desc: '入园缓冲带，先看湖收收心' },
  { id: 'koala',   name: '考拉馆',         type: 'venue',  lat: 32.1125, lng: 118.8325, x: 24, y: 18, slope: 1, shade: 3, stay: 30 },
  { id: 'ape',     name: '猩猩馆',         type: 'venue',  lat: 32.1108, lng: 118.8305, x: 12, y: 38, slope: 2, shade: 2, stay: 25 },
  { id: 'snub',    name: '金丝猴馆',       type: 'venue',  lat: 32.1085, lng: 118.8312, x: 22, y: 55, slope: 2, shade: 3, stay: 25 },
  { id: 'gondwana',name: '冈瓦纳区',       type: 'venue',  lat: 32.1128, lng: 118.8392, x: 76, y: 20, slope: 1, shade: 2, stay: 40, desc: '杜杜、花花、水豚都在这' },
  { id: 'meerkat', name: '细尾獴馆',       type: 'venue',  lat: 32.1110, lng: 118.8408, x: 88, y: 38, slope: 1, shade: 1, stay: 20 },
  { id: 'bear',    name: '熊馆',           type: 'venue',  lat: 32.1095, lng: 118.8380, x: 68, y: 44, slope: 2, shade: 2, stay: 25 },
  { id: 'wolf',    name: '狼谷',           type: 'venue',  lat: 32.1075, lng: 118.8400, x: 84, y: 62, slope: 3, shade: 2, stay: 30, desc: '全园最陡的一段，量力而行' },
  { id: 'local',   name: '本土物种保育区', type: 'venue',  lat: 32.1065, lng: 118.8368, x: 55, y: 78, slope: 2, shade: 3, stay: 35, desc: '复刻湿地，南京原住民的家' },
  { id: 'panda',   name: '小熊猫馆',       type: 'venue',  lat: 32.1105, lng: 118.8332, x: 34, y: 40, slope: 1, shade: 3, stay: 25 },
  { id: 'rest1',   name: '湖畔茶歇',       type: 'rest',   lat: 32.1108, lng: 118.8354, x: 42, y: 34, slope: 0, shade: 3, stay: 20, desc: '有座有树荫有热水' },
  { id: 'food1',   name: '山腰食集',       type: 'food',   lat: 32.1088, lng: 118.8385, x: 62, y: 56, slope: 1, shade: 1, stay: 35 },
  { id: 'rest2',   name: '松林休息区',     type: 'rest',   lat: 32.1075, lng: 118.8338, x: 30, y: 70, slope: 1, shade: 3, stay: 15 },
  { id: 'toilet1', name: '卫生间·北',      type: 'toilet', lat: 32.1122, lng: 118.8362, x: 58, y: 16, slope: 0, shade: 1, stay: 5 },
  { id: 'toilet2', name: '卫生间·南',      type: 'toilet', lat: 32.1078, lng: 118.8382, x: 66, y: 70, slope: 1, shade: 1, stay: 5 },
  { id: 'view1',   name: '山顶观景台',     type: 'view',   lat: 32.1092, lng: 118.8352, x: 46, y: 58, slope: 3, shade: 1, stay: 15, desc: '台阶多，体力好再上' },
  { id: 'east',    name: '东门',           type: 'gate',   lat: 32.1095, lng: 118.8425, x: 94, y: 50, slope: 1, shade: 1, stay: 0 },
]

// WGS-84 → GCJ-02 坐标转换（高德/腾讯国内瓦片必需，否则 marker 偏移 50-100m）
// 国测局 GCJ-02 标准算法，参考 coordtransform 包
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323
function outOfChina(lng: number, lat: number): boolean {
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55)
}
function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  ret += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3
  ret += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3
  return ret
}
function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3
  ret += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3
  ret += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3
  return ret
}
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat]
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180) / (A / sqrtMagic * Math.cos(radLat) * PI)
  return [lng + dLng, lat + dLat]
}

// 工具：把 PoiNode 的 WGS-84 lat/lng 转为 GCJ-02 [lat, lng]（react-leaflet 用 [lat, lng]）
export function poiLatLng(node: PoiNode): [number, number] {
  const [lng, lat] = wgs84ToGcj02(node.lng, node.lat)
  return [lat, lng]
}

// 邻接边：[a, b, 步行分钟]
export const edges: [string, string, number][] = [
  ['north', 'lake', 4],
  ['north', 'toilet1', 3],
  ['north', 'gondwana', 8],
  ['north', 'koala', 7],
  ['lake', 'koala', 5],
  ['lake', 'gondwana', 6],
  ['lake', 'rest1', 4],
  ['lake', 'panda', 5],
  ['toilet1', 'gondwana', 5],
  ['koala', 'ape', 6],
  ['koala', 'panda', 6],
  ['ape', 'snub', 6],
  ['ape', 'panda', 5],
  ['panda', 'rest1', 3],
  ['panda', 'snub', 6],
  ['rest1', 'snub', 7],
  ['rest1', 'view1', 5],
  ['gondwana', 'meerkat', 5],
  ['gondwana', 'bear', 7],
  ['gondwana', 'east', 8],
  ['meerkat', 'bear', 6],
  ['meerkat', 'east', 4],
  ['bear', 'food1', 4],
  ['bear', 'wolf', 6],
  ['food1', 'wolf', 5],
  ['food1', 'local', 5],
  ['food1', 'toilet2', 3],
  ['wolf', 'toilet2', 4],
  ['wolf', 'east', 6],
  ['local', 'toilet2', 4],
  ['local', 'rest2', 6],
  ['local', 'view1', 7],
  ['snub', 'rest2', 5],
  ['snub', 'view1', 6],
  ['rest2', 'view1', 5],
  ['east', 'toilet2', 6],
]

export const nodeMap: Record<string, PoiNode> = Object.fromEntries(nodes.map((n) => [n.id, n]))

// 邻接表
export const adj: Record<string, { to: string; min: number }[]> = {}
for (const n of nodes) adj[n.id] = []
for (const [a, b, m] of edges) {
  adj[a].push({ to: b, min: m })
  adj[b].push({ to: a, min: m })
}

// Dijkstra 最短路（分钟）
export function shortestMin(from: string, to: string): number {
  const dist: Record<string, number> = { [from]: 0 }
  const visited = new Set<string>()
  while (true) {
    let cur = ''
    let best = Infinity
    for (const id in dist) {
      if (!visited.has(id) && dist[id] < best) { best = dist[id]; cur = id }
    }
    if (!cur) break
    if (cur === to) return best
    visited.add(cur)
    for (const e of adj[cur]) {
      const nd = best + e.min
      if (dist[e.to] === undefined || nd < dist[e.to]) dist[e.to] = nd
    }
  }
  return Infinity
}
