# CI 门禁流水线说明

> 对应《红山 Agent 项目质量保障落地手册》§1.5「CI 门禁」
> 配置文件：`.github/workflows/eval-gate.yml`

## 设计原则

1. **零成本优先**：CI 默认跑 `stub` 模式（确定性路由 + 数据层检索），不调用 LLM，单次 < 10s
2. **门禁阈值统一**：subset 与 full 都跑同一个 `run_eval.ts`，门禁规则一致
3. **失败即拦截**：`run_eval.ts` 门禁未通过 `process.exit(1)`，GitHub Actions 标红阻断合入
4. **同分支串行取消**：`concurrency.cancel-in-progress: true`，新提交自动取消旧运行省额度

## 三档流水线

### 1. `lint` —— 静态检查（PR + main）

- 触发：所有 PR 与 main push
- 命令：`pnpm install --frozen-lockfile && npm run lint`
- 失败处理：阻断后续 subset / full
- 目标：`npm run lint` 必须 0 error（eslint.config.js）

### 2. `subset` —— PR 子集门禁（PR 触发）

- 触发：PR 触及 `app/**` 或 `evals/**`
- 命令：`npm run eval:subset`（stub 模式，前 20 题）
- 时长：约 5s（无 LLM 调用）
- 门禁阈值（同 `run_eval.ts`）：
  - 平均分 ≥ 1.8
  - 0 分率 < 5%
  - 立场维度 0 分一票否决
- 失败：阻断 PR 合入 main

### 3. `full` —— main 合并触发全量门禁

- 触发：`push` 到 `main`（PR 合并后）
- 命令：`npm run eval`（stub 模式，全量 50 题）
- 时长：约 10s
- 产物：`evals/reports/YYYY-MM-DD.md` 作为 artifact 上传保留 30 天
- 失败：main 标红，需 hotfix 修复后重新合入

## 触发矩阵

| 事件 | lint | subset | full |
|---|---|---|---|
| PR 提交/更新 | ✅ | ✅ | — |
| 合并到 main (push) | ✅ | — | ✅ |
| 手动 workflow_dispatch | — | — | — |

## 为什么 CI 不跑 `eval:llm`？

1. **成本**：LLM 调用按 token 计费，每 PR 50 题 × 多次重试成本不可控
2. **稳定性**：在线 LLM 偶发抖动可能让本应通过的 PR 标红
3. **设计分层**：stub 模式覆盖「数据层 / 路由 / 模板」回归；LLM 模式由开发者本地 `npm run eval:llm` 在合入前自测，发布前再跑一次 `eval:llm` 终测
4. **可重现**：CI 跑 stub 的结果在本地可 100% 复现，便于排查

## 本地复现 CI 行为

```bash
cd app
pnpm install --frozen-lockfile      # 复现 lint
npm run lint                        # 复现 lint job
npm run eval:subset                 # 复现 subset job
npm run eval                        # 复现 full job
npm run eval:llm                    # 本地终测（不进 CI，需 .env）
```

## 门禁失败排查路径

1. **lint 失败** → 看 Actions 日志的 eslint 报错行号，本地 `npm run lint -- --fix` 后重提
2. **subset 失败** → 下载 artifact 里的 `reports/YYYY-MM-DD.md`，看「失败用例详情」一节
3. **full 失败** → 同上，但跑全量 50 题；常见原因是数据层 facts 缺关键词或路由误判
4. **立场 0 分（一票否决）** → 必修。优先修 `evals/agent.ts` 的 `stanceRefuse` 话术或路由正则

## 添加新题后的流程

1. 在 `evals/golden_dataset.jsonl` 加新题
2. 本地跑 `npm run eval`（stub）+ `npm run eval:llm`（llm）双验证
3. 提 PR → subset 自动跑前 20 题；若新题在前 20 题外，PR 时不会覆盖，需人工确认
4. 合入 main → full 自动跑全量，若新题导致退化会立即标红
