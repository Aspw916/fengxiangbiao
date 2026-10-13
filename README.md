# 风向标 · AI Signal Daily

把今天的 AI，排成一张版。

风向标每天从一批 AI 信源收稿，由评分器**独立打两次分**，按信源分级门槛挑出值得看的信号，把不同来源报道的同一件事**并成事件**，按"多少独立来源在说"计算**共振值**，最后像报纸一样排出头版和每日晨报。

> 引擎思路参考了开源项目 [AIHOT](https://github.com/KKKKhazix/AIHOT)（信源 → 预筛 → 双评分 → 聚簇 → 热度 → 成刊、行业包可配置），界面、视觉与交互是独立设计的。

## 页面

| 地址 | 页面 | 说明 |
|---|---|---|
| `/` | 今日头版 | 按份量排版的头条、次条、快讯与共振前五，有"读完了"的终点 |
| `/signals` | 信号台 | 全部资料 + 可拖动的"信噪比滤网"和分数分布图 |
| `/resonance` | 共振榜 | 事件按共振值排序，来源圆点 + 48 小时报道时间条 |
| `/event/[id]` | 事件档案 | 综述、为什么值得看、报道经过（正序/倒序）、谁在说 |
| `/edition`、`/edition/[date]` | 晨报 | 按栏目编排的每日刊，前后翻阅与往期归档 |
| `/sources` | 信源台 | 信源分级、收稿量与入选率 |
| `/method` | 编辑部手记 | 五道工序与编辑规则 |
| `/clips` | 剪报夹 | 本机收藏，可导出/导入 |
| `/api/v1`、`/feed.xml` | 开放接口 | JSON API 与 RSS |

快捷键：`⌘K` / `Ctrl+K` 或 `/` 查找稿件，`J` / `K` 在稿件间移动；右上角切换日刊 / 夜刊。

## 跑起来

需要 Node.js 22+。

```bash
npm install
npm run dev          # http://localhost:4317
```

首次打开展示的是内置的**示范稿件**（虚构内容，用于演示版面）。抓取真实信源：

```bash
npm run pipeline             # 采集 → 评分写作 → 聚簇 → 共振 → 成刊，写入 data/store.json
npm run pipeline -- --reset  # 删除采集结果，回到示范数据
```

不配置模型时，流水线用启发式评分器打分、保留原文标题。配置任意 OpenAI 兼容接口后，会用模型双评分并写中文标题、摘要和推荐理由：

```bash
cp .env.example .env   # 填入 LLM_API_KEY，按需改 LLM_BASE_URL / LLM_MODEL
```

页面从不调用模型，只读流水线已经算好的结果。可以用 cron 定时运行 `npm run pipeline`。

## 改成你的行业

几乎所有可调的东西都在 `industry/`：

| 文件 | 改什么 |
|---|---|
| `industry/sources.json` | 信源名单与分级（T1 一手 / T2 媒体与个人） |
| `industry/taxonomy.ts` | 站名、栏目分类、启发式关键词 |
| `industry/selection.ts` | 入选门槛、共振窗口与半衰期、聚簇相似度 |
| `industry/prompts/` | 评分口径与写作要求 |

## 目录

```
industry/          行业包：信源、分类、门槛、提示词
scripts/pipeline.ts 流水线入口
src/engine/        引擎：collect 采集、judge 评分写作、cluster 聚簇、heat 共振、build 成刊、store 公开读取层、seed 示范数据
src/app/           页面与接口（Next.js App Router）
src/components/    版面组件（site 报头导航、story 稿件、signals 信号台、edition 晨报）
```

## 检查

```bash
npm run typecheck
npm run lint
```
