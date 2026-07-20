# 红山朋友 PPT · 校验与预览收尾计划

## Summary（摘要）

承接上一轮已完成的内容填充工作（11 页瑞士风 IKB 蓝 HTML 已写入 `红山朋友项目说明PPT.html`），本轮只做**收尾三步**：跑瑞士风版式校验器 → 修正 P0 报错（已预判 1 处）→ OpenPreview 展示成果。

预期产出：用户可在浏览器中横向翻页查看 11 页项目说明 PPT，P0 校验 0 报错。

## Current State Analysis（现状分析）

### 已完成（上一轮）

| 项 | 状态 | 证据 |
|---|---|---|
| 归藏 PPT skill 安装 | ✅ | `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\` 含 SKILL.md / template-swiss.html / validate-swiss-deck.mjs |
| HTML 文件生成 | ✅ | `c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html` 已存在，title 正确 |
| 11 页 section 块 | ✅ | Grep 确认 line 1237-1761 共 11 个 `<section class="slide ...">` |
| 版式编号全部命中登记表 | ✅ | S01 / S03 / S04 / S05 / S06 / S09 / S10 / S11 / S17 / S20 / S22，无 P23/P24 |
| ASCII canvas 命中 ≥2 | ✅ | 3 处：P1 封面(line 1239) / P7 statement(line 1491) / P11 封底(line 1725) |
| SVG 内无可见文字 | ✅ | Grep `<text` 0 命中（P5 line 1397 的 SVG 全是 rect/circle/path/line 几何元素） |
| S22 图片槽位绑定 | ✅ | P5 line 1397 `data-image-slot="s22-hero-21x9"` + `object-position:center center`（非 `top center`） |
| 主题节奏无连续 3 页同色 | ✅ | accent → split → light → dark → light → light → accent → light → light → dark → split |
| IKB 强调字用 italic+weight 300 | ✅ | 多处命中 `font-style:italic;font-weight:300`，封面/封底无 `color:var(--accent)` 蓝压蓝 |
| 字号双约束 Y≥X×1.6 | ✅ | 大量 `min(8.4vw,14vh)` / `min(5vw,8.8vh)` / `min(7.4vw,13vh)` 等合规写法 |

### 待办（本轮）

| 项 | 说明 |
|---|---|
| 跑校验器 | `node validate-swiss-deck.mjs 红山朋友项目说明PPT.html` |
| 修 P1 报错（预判） | P1 当前 `data-layout="S01"` + `<h1 style="align-self:center">` 会触发校验器 line 50-52 报错（S01 不在 isStatement 白名单） |
| 浏览器目视检查 | 翻页/字号/对齐/nav 安全区/主题节奏 |
| OpenPreview 展示 | 用 file:// 协议直接打开本地 HTML |

## Proposed Changes（执行步骤）

### Step 6：跑瑞士风版式校验器

**命令**（PowerShell）：
```powershell
node c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\scripts\validate-swiss-deck.mjs c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html
```

**预期输出**：报 1 个 P0 错误：
```
Swiss deck validation failed:
- Slide 1: top heading appears vertically/centrally aligned. Use the original left-top title skeleton.
```

**根因**：`validate-swiss-deck.mjs` line 50-52 规则：
```js
if (!isStatement && /align-self\s*:\s*center/i.test(topChunk) && /<h[12]\b/i.test(topChunk)) {
  errors.push(`Slide ${slide.idx}: top heading appears vertically/centrally aligned...`);
}
```
- `isStatement` 白名单 = S03 / S09 / S10 / SWISS-COVER-ASCII / SWISS-CLOSING-ASCII
- P1 当前 `data-layout="S01"`（不在白名单）+ line 1246 `<h1 ... style="align-self:center;...">` → 触发报错

### Step 6.1：修正 P1 封面版式编号

**修法**：把 P1 的 `data-layout="S01"` 改为 `data-layout="SWISS-COVER-ASCII"`。

**修改位置**：`红山朋友项目说明PPT.html` line 1237

**修改前**：
```html
<section class="slide accent" data-layout="S01" data-animate="hero">
```

**修改后**：
```html
<section class="slide accent" data-layout="SWISS-COVER-ASCII" data-animate="hero">
```

**理由**：
1. `SWISS-COVER-ASCII` 是归藏 skill 专为「IKB 满屏 + ASCII 呼吸场 + 大标题」封面设计的**登记扩展版式**，校验器 line 17-21 明确允许：
   ```js
   const allowedLayouts = new Set([
     'SWISS-COVER-ASCII',
     'SWISS-CLOSING-ASCII',
     ...Array.from({ length: 22 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`),
   ]);
   ```
2. `SWISS-COVER-ASCII` 在 isStatement 白名单里，允许 `align-self:center`（封面大标题视觉居中是合理设计）
3. 符合 `swiss-layout-lock.md` 第 11 行："新增首页/尾页可以使用 Skill 里的 IKB ASCII 版本，但正文页必须来自这 22 个版式"——封面用 SWISS-COVER-ASCII 比 S01 更符合设计意图
4. P1 当前骨架（`slide accent` + `canvas.ascii-bg` + IKB 满屏 + 白色 weight 200 + italic 强调字）已经完全满足 SWISS-COVER-ASCII 的要求，无需改其他元素

**可选同步修正（推荐但非强制）**：P11 封底 line 1721 `data-layout="S10"` → `data-layout="SWISS-CLOSING-ASCII"`
- S10 当前不报错（在白名单），但语义上 SWISS-CLOSING-ASCII 更准确（专为封底 IKB 半屏 + ASCII 设计）
- 改动零风险，且与 P1 形成「COVER-ASCII ↔ CLOSING-ASCII」语义闭环

### Step 6.2：重跑校验器确认 0 报错

```powershell
node c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\scripts\validate-swiss-deck.mjs c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html
```

**预期输出**：
```
Swiss deck validation passed: 11 slide(s).
```

**门禁**：P0 级问题必须 0。若仍有报错，按报错位置逐项修正，最大 3 轮重试。

### Step 6.3：浏览器目视检查（可选）

打开 `file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/.trae/documents/红山朋友项目说明PPT.html`，逐页确认：
- 翻页流畅（← →/滚轮/触屏）
- 字号下限：正文 ≥18px / caption ≥16px / meta ≥14px
- 字重阶梯：大字 weight 200、中字 300、小字 400+
- nav 安全区：底部 caption/label 不被分页组件遮挡
- 主题节奏：accent → split → light → dark → light → light → accent → light → light → dark → split（无连续 3 页同色）
- IKB 蓝主色统一，无蓝压蓝（封面/封底强调字用 italic 不用 accent 色）

### Step 7：OpenPreview 展示成果

**preview_url**：`file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/.trae/documents/红山朋友项目说明PPT.html`

调用 OpenPreview 工具展示给用户，附 `command_id`（来自 Step 6 校验器命令的 RunCommand 返回值）。

## Assumptions & Decisions（假设与决策）

1. **决策：P1 改用 SWISS-COVER-ASCII 而非删 align-self:center**
   - 理由：封面大标题视觉居中是合理设计意图，不应为了过校验而牺牲视觉；SWISS-COVER-ASCII 就是为此场景设计的登记扩展
   - 替代方案（删 align-self:center 让标题左对齐）会破坏封面冲击力，不采用

2. **决策：P11 同步改用 SWISS-CLOSING-ASCII（推荐）**
   - 理由：与 P1 形成语义闭环，零风险，符合归藏 skill 设计意图
   - 不改也能过校验（S10 在白名单），但语义不够准确

3. **假设：Node.js 已安装且版本 ≥18**
   - 项目用 Vite/tsx，Node 20+ 必备
   - 如失败，先 `node --version` 确认

4. **假设：校验器只报 P1 这 1 个错**
   - 基于 Phase 1 完整 Grep 扫描：SVG 无 text / S22 槽位已绑定 / 无 P23/P24 / 主题节奏合规 / ASCII canvas ≥2
   - 若实际报错超出预期，按报错位置逐项修正

5. **决策：不修改 HTML 内容文案**
   - 上一轮已确认 11 页内容来源（落地全案 §1-3 / 质量手册 §1.2-1.5 / 评测报告 2026-07-18 / animals.ts dudu.hidden / 演示视频计划）
   - 本轮只做版式合规修正，不动文案

## Verification（验证标准）

执行完成后，以下三项全部满足即视为交付：

1. **校验器通过**：`node validate-swiss-deck.mjs 红山朋友项目说明PPT.html` 输出 `Swiss deck validation passed: 11 slide(s).`，P0 级问题为 0

2. **HTML 文件完整**：`红山朋友项目说明PPT.html` 单文件，11 个 `<section class="slide">`，浏览器打开能横向翻页，IKB 蓝主色调统一，无空白页

3. **预览展示**：OpenPreview 工具成功调用，用户可在浏览器中查看成品

## 风险与降级

| 风险 | 等级 | 对策 |
|---|---|---|
| 校验器报错超出预期（>1 个） | 低 | 按报错位置逐项修正，最大 3 轮重试；仍不过则把剩余问题报告给用户后继续交付 |
| Node.js 未安装或版本过低 | 极低 | `node --version` 确认；项目已用 Vite/tsx，Node 20+ 必备 |
| 浏览器打开后视觉异常（字号/对齐/nav 遮挡） | 低 | 目视检查后逐项修正；常见问题：字号过小调大 / nav 安全区加 padding / 主题节奏调整 |
| file:// 协议被浏览器拦截（CSP） | 极低 | 改用本地 http server（`python -m http.server`）作为降级预览方案 |
