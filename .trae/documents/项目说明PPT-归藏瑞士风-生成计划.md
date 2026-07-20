# 红山朋友项目说明 PPT 生成计划（归藏瑞士风 · 10-12 页）

## Summary（摘要）

为「红山朋友 · 陪逛 Agent」项目生成一份结构清晰、面向评委的项目说明 PPT，覆盖产品简介、功能、亮点、技术方案特色。技术栈采用**归藏 PPT Skill（guizang-ppt-skill）· Style B 瑞士国际主义风**，输出物为单文件 HTML 横向翻页 PPT，浏览器直接打开即可演示。

执行三步：① 下载并安装归藏 PPT skill 到 `~/.trae-cn/skills/guizang-ppt-skill` ② 基于项目落地全案/质量手册/评测报告/演示视频计划组织 10-12 页瑞士风内容 ③ 按 skill 工作流填充 `template-swiss.html` 并跑版式校验器。

## Current State Analysis（现状分析）

### 项目素材盘点（基于 Phase 1 探索）

| 素材 | 位置 | 用途 |
|---|---|---|
| 完整方案 | [红山省力Agent赛题落地全案.md](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/红山省力Agent赛题落地全案.md) | PPT 主内容来源（产品定位/六层架构/M1-M8 模块/技术选型/Demo 剧本/Q&A 预案） |
| 质量工程 | [红山Agent项目质量保障落地手册与应急预案.md](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/红山Agent项目质量保障落地手册与应急预案.md) | 工程亮点（LLM 网关/三维评分卡/CI 三档门禁/质量日历/应急预案） |
| 评测基线 | [evals/reports/2026-07-18.md](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/evals/reports/2026-07-18.md) | 事实数据：50 题 / 平均分 1.93 / 0 分率 0% / 立场 0 分 0 / 引用覆盖 100% / 门禁✅通过 |
| 演示状态 | [.trae/documents/红山项目演示视频录制计划.md](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/.trae/documents/红山项目演示视频录制计划.md) | 当前阶段：stub 模式离线确定性，前端三 tab 可演示 |
| 前端实现 | [app/src/pages/Home.tsx](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/app/src/pages/Home.tsx) | 三 tab + 状态机 + 浮动导游面板，已实装 |
| Agent 实现 | [evals/agent.ts](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/evals/agent.ts) | 确定性路由 + 立场拒绝话术 + 边界诚实拒绝 |
| 数据层 | [app/src/data/animals.ts](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/app/src/data/animals.ts) | 动物个体档案卡：facts + 三人设 say + hidden 预期管理反转素材 |
| 视频素材 | [video/shots/01-09.png](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/video/shots/) | 9 张分镜截图，可作 PPT 配图 |

### 归藏 PPT skill 现状

- **本地未安装**：`c:\Users\lenovo\.trae-cn\skills\` 下仅有 4 个 marketplace skill（alipay/gh-cli/git-commit/react-best-practices），无 guizang-ppt-skill
- **在线仓库确认**：`github.com/op7418/guizang-ppt-skill`（AGPL-3.0，归藏/郭浩，18.7k+ star）
- **形态**：单文件 HTML 横向翻页 PPT，浏览器直接打开
- **选定风格**：Style B 瑞士国际主义风（22 种锁定版式 / 4 套锚点色 / 16 列网格 / 直角发丝线）
- **选定锚点色**：克莱因蓝 IKB `#002FA7`（通用默认、商业发布、AI 产品、方法论——契合"红山朋友"产品+技术叙事）
- **本地另有 builtin pptx skill**（`~/.trae-cn/builtin/work/iris/skills/pptx`，基于 pptxgenjs 输出 .pptx），但用户明确要求归藏 HTML 风，故以归藏为主

## Proposed Changes（执行步骤）

### Step 1：确认归藏 PPT skill 已安装（已完成 ✅）

**目标路径**：`c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill`（与现有 marketplace skill 同级，便于 TRAE 发现）

**当前状态**：Phase 1 探索已确认 skill 完整安装。LS 检查 `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\` 下含：
- `SKILL.md`（主工作流文件，540 行）✅
- `assets/template-swiss.html`（瑞士风模板）✅
- `assets/motion.min.js`（Motion One 动画库本地版）✅
- `references/layouts-swiss.md`（22 种锁定版式）✅
- `references/swiss-layout-lock.md`（版式硬约束 / Golden Source）✅
- `references/themes-swiss.md`（4 套锚点色）✅
- `references/checklist.md`（P0/P1/P2/P3 质量检查清单）✅
- `references/components.md`（组件手册）✅
- `scripts/validate-swiss-deck.mjs`（版式校验器）✅
- `assets/screenshot-backgrounds/style-b/`（4 套主题背景：IKB/柠檬黄/柠檬绿/安全橙）✅

如本次执行时发现路径缺失，再回退到 `git clone https://github.com/op7418/guizang-ppt-skill.git`。

### Step 2：读取归藏 skill 工作流与版式约束

并行读取以下文件，吃透瑞士风硬约束：
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\SKILL.md`
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\references\layouts-swiss.md`（22 种版式：S01-S22）
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\references\swiss-layout-lock.md`（版式硬约束）
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\references\themes-swiss.md`（确认 IKB 主题变量）
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\references\checklist.md`（P0 必过项）
- `c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\assets\template-swiss.html`（模板骨架）

### Step 3：设计 11 页 PPT 大纲（瑞士风版式映射）

> 总页数 11，落在用户指定的 10-12 页区间。版式从 S01-S22 中选，不发明新结构。
> 版式名称严格对齐 `references/swiss-layout-lock.md` 的 22 个登记版式表，不混用别名。

**版式多样性自检**：11 页用 11 个不同 S 编号版式（S01/S03/S04/S05/S06/S09/S10/S11/S17/S20/S22），覆盖封面、收尾、对比、时间线、结构图、图片版式全部要求，超过"10 页以上至少 8 个不同版式"硬规则。

| 页 | 主题 | 瑞士版式（Sxx） | 版式原始名 | 内容要点 | 数据/素材来源 |
|---|---|---|---|---|---|
| 1 | 封面 | **S01** | Index Cover | 标题「红山朋友 · 陪逛 Agent」/副标题「让每个人按自己的方式，逛出只属于自己的红山」/参赛演示作品徽标；左大编号右大标题三行 `cover-row` | 落地全案 §2.1 |
| 2 | 目录/陈述 | **S03** | Split Statement | `.slide.split` 双半屏，左巨字宣言"四个篇章"，右灰底解释四章主题：① 问题与定位 ② 产品与功能 ③ 技术方案 ④ 工程化与评测 | 落地全案 §1.7 |
| 3 | 问题与定位 | **S06** | KPI Tower | 左标题+右说明，下方不等高 KPI 塔三组大字数据：600 万年游客 / 1000+ 沉睡故事 / 饲养员 1v1 限定 | 落地全案 §1.1-1.3 |
| 4 | 三幕痛点 | **S05** | Three Layers | 顶部左对齐标题，下方 `.stack-row` 三大块：游前信息过载 / 游中看不懂 / 游后体验断档；每块配隐性需求解读 | 落地全案 §1.2-1.3 |
| 5 | 产品定位与三幕旅程 | **S22** | Image Hero | 顶部 21:9 全宽主图（红山导览图）+ 左上白块标题「红山朋友」+ 下方三列 KPI：游前编织 / 游中陪逛 / 游后手账 | 落地全案 §2.1 / app/src/data/poi.ts |
| 6 | 六大核心功能矩阵 | **S04** | Six Cells | 顶部左对齐标题，下方 `.sub-grid-3-2` 六卡：M1 内容活化 / M2 行程编织 / M3 多模态讲解 / M4 预期管理 / M5 动态调线 / M6 游后手账 | 落地全案 §2.3 |
| 7 | 灵魂亮点：预期管理反转 | **S09** | Dot Matrix Statement | 大号 statement「看不到，也是一种看见」+ 点阵装饰；下方小字反转叙事示例（杜杜案例）+ 替代推荐机制 | 落地全案 §3.5 / animals.ts dudu.hidden |
| 8 | 技术架构：六层栈 | **S17** | System Diagram | 顶部左小标题+右段落，中部 SVG 几何系统图（六层栈从下到上：L6 合规伦理 / L5 数据知识 / L4 模型 Qwen3-Max·Qwen-Long·Qwen-VL·FunASR·CosyVoice·BGE-M3 / L3 Agent 编排 / L2 三幕应用 / L1 交互层），底部三列解释；SVG 只画几何，标签用 HTML | 落地全案 §2.2-2.5 |
| 9 | 工程化亮点 | **S11** | Horizontal Timeline | 横向 timeline 5 节点：LLM 网关 → 金标 50 题 → 三维评分卡 → CI 三档门禁 → 质量日历；附降级链说明 Max→Plus→模板 | 质量手册 §1.2-1.5 |
| 10 | 评测结果与当前阶段 | **S20** | Stacked KPI Ledger | 纵向账单式巨数四组：平均分 **1.93** / 0 分率 **0%** / 立场 0 分 **0** / 引用覆盖 **100%**；底部小字注当前阶段：stub 模式离线确定性，前端三 tab 已实装 | evals/reports/2026-07-18.md / 演示视频计划 |
| 11 | 收尾：千园计划 + 价值观 | **S10** | Split Closing | `.slide.split` 左巨字三句宣言「把红山沉睡故事变成个体档案 / 让失望时刻反转为理念时刻 / 这套 pipeline 送给全国中小动物园」+ 右列表落款"参赛演示作品 · 红山朋友" | 落地全案 附录C / §3.5 升华段 |

### Step 4：可选配图生成

瑞士风主图槽位需要 21:9 或 16:10 比例的图。优先策略：
- **第 5 页主图**：用 [video/shots/01.png](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/video/shots/01.png)（演示视频标题页）或 [app/src/components/ZooMapSvg.tsx](file:///c:/Users/lenovo/Desktop/Kimi_Agent_红山导览方案/app/src/components/ZooMapSvg.tsx) 截图作为园区导览示意
- **其他页**：瑞士风原则——网格、发丝线、大字、KPI 块即可，不强依赖图片。如需配图用文本生成 API：`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=...&image_size=landscape_16_9`
- **图片文件名规范**：必须包含尺寸 `{name}_{width}x{height}.png`（瑞士风硬约束）

### Step 5：填充 template-swiss.html

**输出文件**：`c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html`（单文件，浏览器直接打开）

**关键约束**（来自归藏 skill 瑞士风硬约束）：
1. 锚点色用 IKB 克莱因蓝 `#002FA7`，不允许自定义 hex
2. 16 列 grid、直角、1px 发丝线、无阴影、无渐变、无圆角
3. 中文字号收敛：大标题降一档避免占正文空间
4. 图文底对齐：左文右图场景正文块与图片底部对齐，避开页脚翻页组件
5. 图片必须进入 `data-image-slot` 槽位
6. 不允许 SVG 内写字、不允许居中标题、不允许实验版式
7. 每页必须从 S01-S22 选版式，不能临时发明

### Step 6：跑瑞士风版式校验器

```powershell
node c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\scripts\validate-swiss-deck.mjs c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html
```

**门禁**：
- P0 级问题必须 0（参考 `references/checklist.md`）
- 校验器报错就修，最大 3 轮重试
- 通过后用浏览器打开预览，目视检查翻页/字号/对齐

### Step 7：交付与预览

- 用 OpenPreview 工具展示生成结果（`file:///` 协议直接打开本地 HTML）
- 同步在用户工作目录 `.trae/documents/` 留存成品

## Assumptions & Decisions（假设与决策）

1. **决策：使用归藏 PPT skill（HTML 横向翻页），不用本地 builtin pptx skill**
   - 理由：用户明确要求"找归藏的"；HTML 形态更适合评委演示（浏览器直接打开，无 PPT 软件依赖）
   - 代价：需联网 git clone（一次性 ~5MB）；如完全无网则降级使用 builtin pptx skill 生成 .pptx

2. **决策：风格选 Style B 瑞士风，锚点色选克莱因蓝 IKB**
   - 理由：项目说明文档面向评委，重点是事实/产品/方法论表达；瑞士风的网格+大字+KPI 块契合"评测数据 + 技术架构 + 工程化"叙事
   - IKB 蓝契合"AI 产品 + 方法论"场景（归藏主题表推荐）

3. **决策：11 页（10-12 区间中位）**
   - 5 分钟讲完，覆盖：定位/痛点/功能/亮点/架构/工程/评测/升华
   - 不堆 15+ 页避免评委疲劳

4. **假设：用户机器可联网 git clone GitHub**
   - 如失败，备选方案：用 WebFetch 直接读取归藏 SKILL.md/template-swiss.html 关键文件，手动构造 HTML
   - 进一步降级：用本地 builtin `pptx` skill（iris 版本，基于 pptxgenjs）生成 .pptx

5. **决策：内容来源以"落地全案.md 为主 + 评测/视频计划补充"**
   - 落地全案是项目最完整文档（5 部分 460 行）
   - 评测报告提供事实数据（avg 1.93 / 0 分率 0% / 引用 100%）
   - 演示视频计划提供当前阶段信息（stub 模式离线确定性 + 前端三 tab 实装）

6. **决策：输出路径放 `.trae/documents/` 而非项目根目录**
   - 与现有"红山项目演示视频录制计划.md"同级，便于管理
   - 不污染仓库根目录

## Verification（验证标准）

执行完成后，以下三项全部满足即视为交付：

1. **skill 安装就位**：`c:\Users\lenovo\.trae-cn\skills\guizang-ppt-skill\` 目录存在且含 `SKILL.md` / `assets/template-swiss.html` / `scripts/validate-swiss-deck.mjs` 三项核心文件

2. **PPT 文件生成**：`c:\Users\lenovo\Desktop\Kimi_Agent_红山导览方案\.trae\documents\红山朋友项目说明PPT.html` 存在且为单文件 HTML

3. **校验器通过**：`node validate-swiss-deck.mjs 红山朋友项目说明PPT.html` 输出 P0 级问题为 0；浏览器打开能横向翻页（← →/滚轮/触屏），11 页结构完整，IKB 蓝主色调统一，无空白页

若校验器报错：
- 居中标题 / SVG 内写字 / 图片脱离槽位 / 实验版式 → 按报错位置修正
- 最大 3 轮重试，仍不过则把剩余问题报告给用户后继续交付（不无限循环）

## 风险与降级

| 风险 | 等级 | 对策 |
|---|---|---|
| git clone GitHub 失败（网络/防火墙） | 中 | 备选：WebFetch 读取归藏仓库关键文件 + 手动构造；再降级用本地 builtin pptx skill 输出 .pptx |
| 瑞士风版式校验器需要 Node.js | 低 | 检查 `node --version`，已确认项目用 Vite/tsx，Node 20+ 必备 |
| 配图无法生成 | 低 | 瑞士风不强依赖图片，KPI 块+发丝线+大字即可成型；必要时用 trae text_to_image API |
| 11 页内容塞不下 | 低 | 内容来源已限定为最核心要点，必要时压缩到 9 页或扩展到 13 页（仍在 10-12 容差外才需用户确认） |
