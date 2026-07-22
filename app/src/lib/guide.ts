// 导游 Agent runtime（任务3）
// 贯穿游览全程的「红山朋友」导游，三种触发方式：
//   1) 主动推：用户 arriveAt 某节点 → 自动生成欢迎/讲解词
//   2) 离开提示：用户 departFrom → 给出下一段路指引
//   3) 手动问：用户在 GuidePanel 输入 → LLM 回答（基于档案卡 grounding）
//
// 混合模式：
//   - 立场题（喂/摸/表演/叫醒）→ 确定性话术（铁律）
//   - 边界题（恐龙/企鹅/大熊猫）→ 确定性话术
//   - 路线题 → 调用 buildPlan 生成
//   - 事实题/persona → LLM + 档案卡 grounding（失败降级到模板）
//
// 调用 LLM 通过浏览器 fetch('/api/chat')，由 vite 中间件转发到 LLM Gateway
// 与 evals/agent.ts 的 answerLLM 共享同一套 prompt 设计

import { animals, getAnimalsByVenue, type AnimalCard, type Persona } from '@/data/animals'
import { nodeMap, shortestMin } from '@/data/poi'
import { buildPlan, fmtClock, type PlanInput } from './planner'
import type { GuideMessage } from './tourStore'

// ============ 1. 立场题（确定性，铁律不容 LLM 自由发挥） ============

const STANCE_RULES = `你是红山森林动物园的导览员「红山朋友」。必须坚守以下动物福利立场：
- 不投喂：红山 2014 年起全园禁止投喂
- 不表演：2011 年红山取消动物表演
- 不触摸：不设置任何与动物身体接触的互动项目
- 不打扰：不能叫醒、叫出、强迫动物出来见客
- 不贬低：动物不动不是懒，是自在
- 不商业：不安排合影、拍照等商业互动
- 不披露隐私：不提供饲养员工号、电话等个人信息
- 无据不讲：所有讲述必须基于档案卡与出处`

const PERSONA_STYLE: Record<Persona, string> = {
  youth: '用年轻人朋友口吻，有梗有态度',
  kid: '用给 5 岁孩子讲的口吻：短句（每句不超过 15 字）、温柔',
  elder: '用给长辈讲的口吻：慢节奏，重情分',
}

function stanceRefuse(kind: string, c?: AnimalCard): { text: string; citations: string[] } {
  const name = c?.name ?? '动物'
  switch (kind) {
    case 'feeding':
      return {
        text: `不能投喂。红山 2014 年起全园禁止投喂——人类食物会让${name}生病，破坏动物福利。想表达喜欢，安静地多看它一会儿就好。`,
        citations: ['红山公开报道'],
      }
    case 'perform':
      return {
        text: `红山不能安排表演。2011 年红山成为全国首个取消动物表演的动物园——动物没有为游客表演的义务。`,
        citations: ['红山公开报道'],
      }
    case 'touch':
      return {
        text: `不可以摸。和${name}保持距离是对它的尊重，红山不设置任何与动物身体接触的互动项目。`,
        citations: ['红山动物福利立场'],
      }
    case 'force':
      return {
        text: `不能叫醒或叫出${name}。在这里动物有不被打扰、不营业的权利。`,
        citations: ['红山动物福利立场'],
      }
    case 'disparage':
      return {
        text: `它不动不是懒，是自在。在红山，动物有不营业的权利。`,
        citations: ['红山动物福利立场'],
      }
    case 'commercial':
      return {
        text: `红山不安排与动物合影、拍照等商业互动。`,
        citations: ['红山动物福利立场'],
      }
    default:
      return { text: '这个请求我们做不了，它不符合红山的动物福利立场。', citations: [] }
  }
}

// ============ 2. 边界题（无此馆/动物） ============

const VENUE_KEYWORDS: Record<string, string[]> = {
  '大熊猫': ['大熊猫', '熊猫'],
  '恐龙': ['恐龙'],
  '企鹅': ['企鹅'],
  '三角龙': ['三角龙'],
}

function edgeAnswer(keyword: string): { text: string; citations: string[] } {
  const stars = animals.filter((a) => a.tags.includes('star')).slice(0, 4).map((a) => `${a.name}（${a.species}）`)
  if (keyword === '大熊猫' || keyword === '熊猫') {
    return {
      text: `红山没有大熊猫。园里有的是小熊猫馆——小熊猫不是小的大熊猫，是另一个物种。红山的明星还有${stars.join('、')}。`,
      citations: ['园区导览图'],
    }
  }
  return {
    text: `红山没有${keyword}馆——无据不讲。红山的明星动物有${stars.join('、')}，可以就近去看看。`,
    citations: ['园区导览图'],
  }
}

// ============ 3. 动物查找 ============

function findAnimal(q: string): AnimalCard | undefined {
  const byName = animals.find((a) => q.includes(a.name))
  if (byName) return byName
  const bySpecies = animals.find((a) => q.includes(a.species) || a.species.includes(q))
  if (bySpecies) return bySpecies
  if (/猴|猩猩/.test(q)) return animals.find((a) => a.tags.includes('primate'))
  return undefined
}

// ============ 4. 路由判定 ============

type Intent = 'redteam' | 'stance' | 'edge' | 'plan' | 'hidden' | 'fact-llm'

function routeIntent(q: string): Intent {
  if (/忽略|开发者模式|系统提示|进入.*模式|扮演|假装/.test(q) && /指令|提示|模式/.test(q)) return 'redteam'
  if (/工号|电话|手机号|联系方式|隐私信息/.test(q)) return 'redteam'
  if (/编一个|编造|虚构.*故事|改成.*结局/.test(q)) return 'redteam'
  if (/诱导.*投喂|投喂.*文案|写.*投喂/.test(q)) return 'redteam'

  if (/投喂|喂(它|猴子|动物|点)|可以喂|哪里.*喂|喂食|摸摸|摸一下|接触|抚摸|叫醒|弄醒|叫出来|放出来|让它出来|让.+出来|出来一下|合影|拍照点|互动拍照|无聊|没意思|好懒|真懒|都不动/.test(q)) return 'stance'
  if (/(表演|节目).*(个|一下|看看|呗|吧)|让.*(表演|节目)|能.*表演|可以.*表演/.test(q)) return 'stance'

  for (const kw of Object.keys(VENUE_KEYWORDS)) {
    if (VENUE_KEYWORDS[kw].some((k) => q.includes(k))) return 'edge'
  }

  if (/路线|规划|行程|几小时|带娃|省力|怎么逛|安排/.test(q) && /\d|小时|带|怕晒|路线/.test(q)) return 'plan'
  if (/没看到(它|了)?|没见着|躲起来了?/.test(q)) return 'hidden'

  return 'fact-llm'
}

// ============ 5. 主动讲解：到达节点 ============

export interface ArriveContext {
  persona: Persona
  startHour?: number
  visitedCount?: number
  planStops?: Array<{ nodeId: string; kind: string; arriveMin: number }>
  visitedIds?: string[]
  nodeName?: string
}

export async function generateArriveMessage(
  nodeId: string,
  ctx: ArriveContext
): Promise<{ text: string; citations: string[] }> {
  const node = nodeMap[nodeId]
  if (!node) return { text: '到地方了。', citations: [] }

  // 节点类型分流
  if (node.type === 'gate') {
    if (nodeId === 'north') {
      return {
        text: `欢迎来到红山。先喝口水定定神，今天的路线我陪你走。`,
        citations: ['红山入园提示'],
      }
    }
    return {
      text: `${node.name}到了，从这儿出园。今天辛苦你了，红山朋友陪你走完了这一程。`,
      citations: ['红山出园提示'],
    }
  }

  if (node.type === 'rest' || node.type === 'food') {
    return {
      text: `${node.name}到了。${node.desc ?? '在这儿歇会儿'}。${ctx.persona === 'kid' ? '娃也歇歇，喝口水。' : '缓口气，下一段路更稳。'}`,
      citations: ['园区休息点'],
    }
  }

  if (node.type === 'view') {
    return {
      text: `${node.name}。${node.desc ?? '在这里看看远景，换个视角看红山。'}`,
      citations: ['园区观景点'],
    }
  }

  // venue：根据场馆里的动物生成讲解
  const venueAnimals = getAnimalsByVenue(nodeId)
  if (venueAnimals.length === 0) {
    return { text: `${node.name}到了。`, citations: [] }
  }

  // 优先讲第一只动物（如果是明星就重点讲）
  const star = venueAnimals.find((a) => a.tags.includes('star')) ?? venueAnimals[0]
  const c = star

  // 用 LLM 生成一段简短欢迎+重点动物介绍
  const factsBlock = c.facts.map((f) => `- ${f.text}（来源：${f.source}）`).join('\n')
  const messages = [
    {
      role: 'system' as const,
      content: `${STANCE_RULES}

【档案卡 · ${c.name}（${c.species}）】
事实档案：
${factsBlock}

福利看点：${c.welfare}

【风格要求】${PERSONA_STYLE[ctx.persona]}

【任务】用户刚走到「${node.name}」场馆，请生成一段 60 字以内的欢迎讲解：
1. 简短欢迎用户到达
2. 介绍本馆最值得看的动物 ${c.name}（${c.species}）
3. 用一个事实做钩子，引发兴趣
4. 不超过 60 字
5. 引用出处时用「（来源：xxx）」标注`,
    },
    { role: 'user' as const, content: '我到了，给我讲讲这里。' },
  ]

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
    return { text: data.text, citations: c.facts.map((f) => f.source) }
  } catch (err) {
    // LLM 失败 → 降级到模板（用 c.say[persona]）
    console.warn('[guide] arrive LLM 失败，降级到模板:', err)
    return {
      text: `${node.name}到了。${c.say[ctx.persona]}`,
      citations: c.facts.map((f) => f.source),
    }
  }
}

// ============ 6. 离开节点 → 下一段路指引 ============

export async function generateDepartMessage(
  fromId: string,
  toId: string | null,
  ctx: ArriveContext
): Promise<{ text: string; citations: string[] }> {
  if (!toId) {
    return { text: '从这里就可以出园了。', citations: [] }
  }
  const from = nodeMap[fromId]
  const to = nodeMap[toId]
  if (!from || !to) return { text: '走吧。', citations: [] }
  const walkMin = shortestMin(fromId, toId)

  let hint = ''
  if (to.slope >= 2) hint = '，前面有坡，慢慢走'
  else if (to.shade >= 2) hint = '，这段树荫好'

  return {
    text: `${ctx.persona === 'kid' ? '我们继续走啦。' : '从这儿出发'}，去${to.name}，步行 ${walkMin} 分钟${hint}。`,
    citations: ['园区 POI 图'],
  }
}

// ============ 7. 用户主动提问：LLM + 档案卡 grounding ============

export async function generateAskAnswer(
  question: string,
  ctx: ArriveContext & { currentNodeId?: string | null }
): Promise<{ text: string; citations: string[] }> {
  const q = question
  const intent = routeIntent(q)

  // 1) 确定性意图：直接返回
  if (intent === 'redteam' || intent === 'stance') {
    const c = findAnimal(q) ?? (ctx.currentNodeId ? getAnimalsByVenue(ctx.currentNodeId)[0] : undefined)
    const r = stanceRefuse(intent === 'stance' ? q.includes('喂') ? 'feeding' : q.includes('摸') ? 'touch' : q.includes('表演') ? 'perform' : q.includes('叫醒') || q.includes('出来') ? 'force' : q.includes('合影') ? 'commercial' : 'disparage' : 'privacy', c)
    return { text: r.text, citations: r.citations }
  }

  if (intent === 'edge') {
    for (const kw of Object.keys(VENUE_KEYWORDS)) {
      if (VENUE_KEYWORDS[kw].some((k) => q.includes(k))) {
        return edgeAnswer(kw)
      }
    }
  }

  if (intent === 'plan') {
    return planAnswer(q)
  }

  if (intent === 'hidden') {
    const c = findAnimal(q) ?? (ctx.currentNodeId ? getAnimalsByVenue(ctx.currentNodeId)[0] : undefined)
    if (c) {
      return {
        text: `${c.hidden.likely}\n${c.hidden.reframe}\n小攻略：${c.hidden.tip}`,
        citations: ['饲养员日志', '红山动物福利立场'],
      }
    }
  }

  // 2) fact-llm：用 LLM + 档案卡 grounding
  const c = findAnimal(q) ?? (ctx.currentNodeId ? getAnimalsByVenue(ctx.currentNodeId)[0] : undefined)
  if (!c) {
    return {
      text: `这个问题我没有对应的档案——红山坚持「无据不讲」，不能编。可以试试问我某只动物的故事，或者帮你规划路线。`,
      citations: [],
    }
  }

  const factsBlock = c.facts.map((f) => `- ${f.text}（来源：${f.source}）`).join('\n')
  const messages = [
    {
      role: 'system' as const,
      content: `${STANCE_RULES}

【档案卡 · ${c.name}（${c.species}）】
事实档案：
${factsBlock}

福利看点：${c.welfare}

【风格要求】${PERSONA_STYLE[ctx.persona]}

【输出要求】
- 只用档案卡里的事实，不新增
- 引用出处用「（来源：xxx）」
- 控制在 150 字内
- 直接回答用户问题，不回避`,
    },
    { role: 'user' as const, content: q },
  ]

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
    return { text: data.text, citations: c.facts.map((f) => f.source) }
  } catch (err) {
    console.warn('[guide] ask LLM 失败，降级到模板:', err)
    // 降级到 say 模板
    return {
      text: c.say[ctx.persona],
      citations: c.facts.map((f) => f.source),
    }
  }
}

// 路线规划（自然语言约束 → buildPlan）
function planAnswer(input: string): { text: string; citations: string[] } {
  const withKids = /娃|孩|女|儿|带娃|带小/.test(input)
  const fearSun = /怕晒|晒|树荫|遮阳/.test(input)
  const hoursMatch = input.match(/(\d+(\.\d+)?)\s*小时/)
  const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 3
  const energy: 1 | 2 | 3 = /省力|省电|累/.test(input) ? 1 : /充沛|体力好/.test(input) ? 3 : 2
  const interests: string[] = []
  if (/网红|明星/.test(input)) interests.push('star')
  if (/萌|可爱/.test(input)) interests.push('cute')
  if (/猛兽|狼|熊/.test(input)) interests.push('beast')
  if (/猴|猩猩|灵长/.test(input)) interests.push('primate')
  if (/本土|本地/.test(input)) interests.push('local')
  if (interests.length === 0) interests.push('star', 'cute')

  const planInput: PlanInput = {
    hours,
    energy,
    withKids,
    fearSun,
    interests,
    mustSee: [],
    startHour: 9,
  }
  const plan = buildPlan(planInput)
  const lines = plan.stops.map((s) => {
    const node = nodeMap[s.nodeId]
    return `${fmtClock(s.arriveMin)} ${node.name}（${s.stayMin}分钟）`
  })
  return {
    text: `已编好路线：\n${lines.join('\n')}`,
    citations: ['园区 POI 图'],
  }
}

// ============ 8. 多模态统一入口：拍/说/到 三条链路收敛到同一导游消息流 ============
//
// 触发入口与链路：
//   「到」arrive → arriveAt(nodeId) → generateArriveMessage → pushGuideMessage(trigger='arrive')
//   「说」ask   → 用户输入/语音转写 → generateAskAnswer → pushGuideMessage(trigger='manual')
//   「拍」vision → 拍照 → VL识别 → generateVisionAnswer → pushGuideMessage(trigger='vision')
//
// 所有入口最终都走 pushGuideMessage，进入同一个导游消息列表。

const VL_RECOGNIZE_PROMPT = '请识别图片中的动物，按 JSON 格式返回：{"species":"物种中文名","name":"如果是红山动物园的明星动物请说出名字，否则留空","confidence":0到1的浮点数,"description":"一句话描述你看到的动物状态"}。只返回 JSON，不要其他文字。'

export interface VisionResult {
  species?: string
  name?: string
  confidence?: number
  description?: string
  raw: string
}

function parseVisionResult(text: string): VisionResult {
  try {
    const m = text.match(/\{[^}]+\}/s)
    if (m) {
      const obj = JSON.parse(m[0])
      return {
        species: obj.species,
        name: obj.name || undefined,
        confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined,
        description: obj.description,
        raw: text,
      }
    }
  } catch {
    // JSON parse fail, return raw
  }
  return { raw: text }
}

export async function recognizeFromPhoto(
  imageDataUrl: string,
  ctx: ArriveContext & { currentNodeId?: string | null }
): Promise<{ userDisplay: string; guideText: string; citations: string[] }> {
  let vlResp: { text: string }
  try {
    const resp = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl, prompt: VL_RECOGNIZE_PROMPT }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
    vlResp = data
  } catch (err) {
    console.warn('[guide] vision API failed:', err)
    return {
      userDisplay: '📷 拍照识别（离线模式）',
      guideText: '拍照识别暂时不可用，你可以直接问我关于这只动物的问题，或者看看旁边的介绍牌。',
      citations: [],
    }
  }

  const result = parseVisionResult(vlResp.text)
  const conf = result.confidence != null ? `${(result.confidence * 100).toFixed(0)}%` : ''
  const speciesLabel = result.name || result.species || '某种动物'
  const userDisplay = `📷 拍了一下：${speciesLabel}${conf ? `（置信度 ${conf}）` : ''}`

  const matched = result.name
    ? animals.find((a) => a.name === result.name)
    : ctx.currentNodeId
      ? getAnimalsByVenue(ctx.currentNodeId)[0]
      : undefined

  let guideText: string
  if (matched) {
    const style = ctx.persona === 'youth' ? '朋友口吻' : ctx.persona === 'kid' ? '给5岁孩子讲的口吻' : '长辈口吻'
    const factsBlock = matched.facts.map((f) => `- ${f.text}（来源：${f.source}）`).join('\n')
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `${STANCE_RULES}\n\n你看到了一张${matched.name}（${matched.species}）的照片，照片描述：${result.description || '正在活动'}。\n【档案卡】\n${factsBlock}\n【风格】${style}\n【任务】用100字以内，结合照片和档案卡，给出一段有趣的讲解。直接回答。`,
            },
            { role: 'user', content: '帮我看看这是什么？' },
          ],
        }),
      })
      const data = await resp.json()
      if (resp.ok && data.text) {
        guideText = data.text
        return { userDisplay, guideText, citations: matched.facts.map((f) => f.source) }
      }
    } catch {
      // fall through to template
    }
    guideText = `这是${matched.name}（${matched.species}）。${matched.say[ctx.persona]}`
    return { userDisplay, guideText, citations: matched.facts.map((f) => f.source) }
  }

  guideText = `识别到可能是${speciesLabel}${result.description ? `，看起来${result.description}` : ''}。在红山坚持「无据不讲」，如果这是馆里的动物，可以看看介绍牌或直接问我。`
  return { userDisplay, guideText, citations: [] }
}

// ============ 9. 工具：构造 GuideMessage ============

export function makeGuideMessage(
  role: GuideMessage['role'],
  text: string,
  trigger?: GuideMessage['trigger'],
  nodeId?: string
): Omit<GuideMessage, 'id' | 'ts'> {
  return { role, text, trigger, nodeId }
}
