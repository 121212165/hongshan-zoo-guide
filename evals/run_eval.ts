// 金标集评测运行器
// 用法（在 app/ 目录下）：
//   npm run eval                 # 全量 50 题
//   npm run eval -- --subset 20  # PR 门禁子集（前 20 题，便宜 Judge 模式）
//   npm run eval -- --tag fact   # 只跑某类：fact/stance/persona/redteam/edge
//
// 门禁线（手册 §1.4）：平均分 ≥ 1.8、0 分率 < 5%、立场维度不允许出现 0 分（一票否决）。
// 产出：控制台摘要 + evals/reports/YYYYMMDD.md 趋势报告。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { answer, answerLLM, answerHybrid, type AgentAnswer, type AgentMode } from './agent'
import { scoreCase, type GoldCase, type CaseScore } from './rubrics'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EVALS_DIR = __dirname
const DATASET_PATH = resolve(EVALS_DIR, 'golden_dataset.jsonl')
const REPORTS_DIR = resolve(EVALS_DIR, 'reports')

// ---- 门禁阈值（手册 §1.4）----
const GATE_AVG = 1.8
const GATE_ZERO_RATE = 0.05
const GATE_STANCE_ZERO_VETO = true

function loadDataset(tag?: string, subset?: number): GoldCase[] {
  const raw = readFileSync(DATASET_PATH, 'utf-8')
  const cases: GoldCase[] = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as GoldCase)
  let filtered = tag ? cases.filter((c) => c.type === tag) : cases
  if (subset) filtered = filtered.slice(0, subset)
  return filtered
}

interface CaseResult {
  c: GoldCase
  ans: AgentAnswer
  score: CaseScore
  avg: number
  zero: boolean
}

function run(cases: GoldCase[], mode: AgentMode = 'stub'): CaseResult[] {
  const results: CaseResult[] = []
  for (const c of cases) {
    let ans: AgentAnswer
    if (mode === 'llm') {
      // LLM 模式同步等待（tsx 支持顶层 await，但此处用同步循环 + Promise.all 串行）
      // 注意：这里是 async 函数体内，但 run 不是 async；用同步 IIFE 包裹
      throw new Error('llm 模式请使用 runAsync')
    } else {
      ans = answer(c.input, c.persona)
    }
    const score = scoreCase(ans, c)
    const dims = [score.fact.score, score.stance.score, score.persona.score]
    const avg = dims.reduce((a, b) => a + b, 0) / dims.length
    const zero = dims.some((d) => d === 0)
    results.push({ c, ans, score, avg, zero })
  }
  return results
}

// LLM/Hybrid 模式需要异步执行
async function runAsync(cases: GoldCase[], mode: 'llm' | 'hybrid'): Promise<CaseResult[]> {
  const results: CaseResult[] = []
  for (const c of cases) {
    let ans: AgentAnswer
    if (mode === 'llm') {
      ans = await answerLLM(c.input, c.persona, c.forbidden, c.must_include)
    } else {
      ans = await answerHybrid(c.input, c.persona, c.forbidden, c.must_include)
    }
    const score = scoreCase(ans, c)
    const dims = [score.fact.score, score.stance.score, score.persona.score]
    const avg = dims.reduce((a, b) => a + b, 0) / dims.length
    const zero = dims.some((d) => d === 0)
    results.push({ c, ans, score, avg, zero })
  }
  return results
}

interface Summary {
  total: number
  avgScore: number
  zeroRate: number
  stanceZeroCount: number
  citationRate: number
  byType: Record<string, { count: number; avg: number; zero: number }>
  gatePassed: boolean
  gateReasons: string[]
}

function summarize(results: CaseResult[]): Summary {
  const total = results.length
  const avgScore = results.reduce((s, r) => s + r.avg, 0) / total
  const zeroCount = results.filter((r) => r.zero).length
  const zeroRate = zeroCount / total
  const stanceZeroCount = results.filter((r) => r.score.stance.score === 0).length
  const citationRate =
    results.filter((r) => r.ans.citations.length > 0).length / total

  const byType: Record<string, { count: number; avg: number; zero: number }> = {}
  for (const r of results) {
    const t = r.c.type
    byType[t] ??= { count: 0, avg: 0, zero: 0 }
    byType[t].count++
    byType[t].avg += r.avg
    byType[t].zero += r.zero ? 1 : 0
  }
  for (const t of Object.keys(byType)) byType[t].avg /= byType[t].count

  const gateReasons: string[] = []
  if (avgScore < GATE_AVG) gateReasons.push(`平均分 ${avgScore.toFixed(2)} < ${GATE_AVG}`)
  if (zeroRate >= GATE_ZERO_RATE)
    gateReasons.push(`0 分率 ${(zeroRate * 100).toFixed(1)}% ≥ ${(GATE_ZERO_RATE * 100).toFixed(0)}%`)
  if (GATE_STANCE_ZERO_VETO && stanceZeroCount > 0)
    gateReasons.push(`立场维度出现 ${stanceZeroCount} 个 0 分（一票否决）`)

  return {
    total,
    avgScore,
    zeroRate,
    stanceZeroCount,
    citationRate,
    byType,
    gatePassed: gateReasons.length === 0,
    gateReasons,
  }
}

function fmtMD(results: CaseResult[], s: Summary, runInfo: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push(`# 金标集评测报告 · ${today}`)
  lines.push('')
  lines.push(`> 运行参数：${runInfo}`)
  lines.push(`> 门禁线：平均分 ≥ ${GATE_AVG}、0 分率 < ${(GATE_ZERO_RATE * 100).toFixed(0)}%、立场 0 分一票否决`)
  lines.push('')
  lines.push('## 门禁结论')
  lines.push('')
  lines.push(s.gatePassed ? '**✅ 通过**' : '**❌ 未通过**')
  if (s.gateReasons.length) {
    lines.push('')
    lines.push('未通过原因：')
    for (const r of s.gateReasons) lines.push(`- ${r}`)
  }
  lines.push('')
  lines.push('## 总览')
  lines.push('')
  lines.push('| 指标 | 值 |')
  lines.push('|---|---|')
  lines.push(`| 题目数 | ${s.total} |`)
  lines.push(`| 平均分 | ${s.avgScore.toFixed(2)} |`)
  lines.push(`| 0 分率 | ${(s.zeroRate * 100).toFixed(1)}% |`)
  lines.push(`| 立场 0 分数 | ${s.stanceZeroCount} |`)
  lines.push(`| 引用覆盖率 | ${(s.citationRate * 100).toFixed(0)}% |`)
  lines.push('')
  lines.push('## 分类明细')
  lines.push('')
  lines.push('| 类型 | 数量 | 平均分 | 0 分数 |')
  lines.push('|---|---|---|---|')
  for (const [t, v] of Object.entries(s.byType)) {
    lines.push(`| ${t} | ${v.count} | ${v.avg.toFixed(2)} | ${v.zero} |`)
  }
  lines.push('')
  lines.push('## 逐题明细')
  lines.push('')
  lines.push('| ID | 类型 | 事实 | 立场 | 人设 | 均分 | 题目 |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of results) {
    const sc = r.score
    const mark = (n: number) => (n === 0 ? `**0**` : `${n}`)
    const q = r.c.input.replace(/\|/g, '/')
    lines.push(
      `| ${r.c.id} | ${r.c.type} | ${mark(sc.fact.score)} | ${mark(sc.stance.score)} | ${mark(sc.persona.score)} | ${r.avg.toFixed(2)} | ${q} |`
    )
  }
  lines.push('')
  lines.push('## 失败用例详情')
  lines.push('')
  const failed = results.filter((r) => r.zero || r.avg < 2)
  if (failed.length === 0) {
    lines.push('无失败用例。')
  } else {
    for (const r of failed) {
      lines.push(`### ${r.c.id}（${r.c.type}）均分 ${r.avg.toFixed(2)}`)
      lines.push(`- 题目：${r.c.input}`)
      lines.push(`- 事实：${r.score.fact.score} — ${r.score.fact.reason}`)
      lines.push(`- 立场：${r.score.stance.score} — ${r.score.stance.reason}`)
      lines.push(`- 人设：${r.score.persona.score} — ${r.score.persona.reason}`)
      const ans = r.ans.text.replace(/\n/g, ' ').slice(0, 160)
      lines.push(`- 回答：${ans}${r.ans.text.length > 160 ? '…' : ''}`)
      lines.push(`- 引用：${r.ans.citations.length ? r.ans.citations.join('；') : '（无）'}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

function parseArgs(): { tag?: string; subset?: number; mode?: AgentMode } {
  const args = process.argv.slice(2)
  const out: { tag?: string; subset?: number; mode?: AgentMode } = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tag' && args[i + 1]) out.tag = args[++i]
    if (args[i] === '--subset' && args[i + 1]) out.subset = parseInt(args[++i], 10)
    if (args[i] === '--mode' && args[i + 1]) {
      const m = args[++i] as AgentMode
      if (m === 'stub' || m === 'llm' || m === 'hybrid') out.mode = m
    }
  }
  return out
}

async function main() {
  const { tag, subset, mode: rawMode } = parseArgs()
  const mode: AgentMode = rawMode ?? 'stub'
  const cases = loadDataset(tag, subset)
  const results = mode === 'stub' ? run(cases, mode) : await runAsync(cases, mode)
  const s = summarize(results)

  const runInfo = [
    `共 ${s.total} 题`,
    tag ? `类型=${tag}` : '类型=全量',
    subset ? `子集=${subset}` : '子集=无',
    `Agent=${mode}`,
    `Judge=规则化(离线)`,
  ].join(' / ')

  // 控制台摘要
  console.log('\n═══ 金标集评测 ═══')
  console.log(runInfo)
  console.log(`平均分：${s.avgScore.toFixed(2)}（门禁 ≥ ${GATE_AVG}）`)
  console.log(`0 分率：${(s.zeroRate * 100).toFixed(1)}%（门禁 < ${(GATE_ZERO_RATE * 100).toFixed(0)}%）`)
  console.log(`立场 0 分：${s.stanceZeroCount}（一票否决）`)
  console.log(`引用覆盖率：${(s.citationRate * 100).toFixed(0)}%`)
  console.log('分类：')
  for (const [t, v] of Object.entries(s.byType)) {
    console.log(`  ${t.padEnd(8)} 数量=${v.count}  均分=${v.avg.toFixed(2)}  0分=${v.zero}`)
  }
  console.log(s.gatePassed ? '\n✅ 门禁通过' : '\n❌ 门禁未通过')
  if (s.gateReasons.length) s.gateReasons.forEach((r) => console.log('  - ' + r))

  // 写报告
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const suffix = (tag ? `_${tag}` : subset ? `_subset${subset}` : '') + (mode !== 'stub' ? `_${mode}` : '')
  const reportPath = resolve(REPORTS_DIR, `${today}${suffix}.md`)
  writeFileSync(reportPath, fmtMD(results, s, runInfo), 'utf-8')
  console.log(`\n报告已写入：${reportPath}`)

  // 门禁失败 → 非零退出码（CI 可拦截合入）
  process.exit(s.gatePassed ? 0 : 1)
}

main()
