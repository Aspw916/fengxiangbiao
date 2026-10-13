# 风向标 · AI Signal Daily

只看真正重要的 AI 动态。

风向标每天从一批 AI 信源收集资料，**独立评分两次**，按信源分级门槛筛出值得看的内容，把不同来源报道的同一件事**合并成事件**，按"有多少独立来源在说"计算**共振**，再生成每日日报。

> 引擎思路参考开源项目 [AIHOT](https://github.com/KKKKhazix/AIHOT)（信源 → 双评分 → 聚合 → 热度 → 成刊、行业包可配置），界面与交互独立设计。

## 页面

| 地址 | 页面 | 说明 |
|---|---|---|
| `/` | 今日 | 大搜索框 + 今日要闻 + 值得一看 + 快讯 |
| `/signals` | 信号 | 全部资料，可拖动的分数线与分数分布 |
| `/resonance` | 共振 | 事件按共振排序，来源圆点 + 48 小时报道时间条 |
| `/event/[id]` | 事件 | 摘要、为什么重要、报道经过、谁在说 |
| `/edition`、`/edition/[date]` | 日报 | 按栏目编排的每日内容与往期 |
| `/sources`、`/method` | 信源、方法 | 信源入选率；流水线说明 |
| `/clips` | 收藏 | 只存本机，可导出 / 导入 |
| `/api/v1`、`/feed.xml` | 开放接口 | JSON API 与 RSS |

快捷键：`⌘K` / `/` 搜索，`J` / `K` 在条目间移动。默认深色，右上角切换浅色。

## 本地运行

需要 Node.js 22+。

```bash
npm install
npm run dev                  # http://localhost:4317
npm run pipeline             # 抓取真实信源，写入 data/store.json
npm run pipeline -- --reset  # 回到示范数据
```

没有任何数据时，网站显示内置的**示范数据**（虚构内容，顶栏有"示范数据"标记）。

## 部署到 Vercel

1. 把仓库导入 Vercel（框架自动识别为 Next.js，无需改构建设置）。
2. 在项目的 **Storage** 里创建并连接一个 **Blob** 存储，Vercel 会自动注入 `BLOB_READ_WRITE_TOKEN`。
3. 在 **Settings → Environment Variables** 添加 `CRON_SECRET`（任意长随机字符串），按需添加模型相关变量。
4. 部署。`vercel.json` 里的 Cron 会定时调用 `/api/cron/pipeline` 抓取、评分并把结果写入 Blob；页面每 60 秒读取一次最新结果。

首次部署后可以手动触发一次，不必等 Cron：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<你的域名>/api/cron/pipeline
```

Vercel 运行时文件系统只读，所以线上不会写本地文件：没连 Blob 时网站只显示示范数据，Cron 会返回明确的错误提示。

### 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | 线上必需 | 连接 Vercel Blob 后自动注入；本地设置后流水线也会写 Blob |
| `CRON_SECRET` | 线上必需 | Cron 路由的鉴权；Vercel Cron 会自动带上 `Authorization: Bearer $CRON_SECRET` |
| `LLM_API_KEY` | 可选 | 任意 OpenAI 兼容接口的密钥；不填时用启发式评分、保留原文标题 |
| `LLM_BASE_URL` | 可选 | 默认 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 可选 | 默认 `deepseek-chat` |
| `PIPELINE_MAX_NEW` | 可选 | 每次最多处理多少条新资料，默认 40（控制单次运行时长与模型费用） |
| `STORE_BLOB_PATH` | 可选 | Blob 中的文件路径，默认 `fengxiangbiao/store.json` |
| `STORE_BLOB_ACCESS` | 可选 | `private`（默认）或 `public`，需与 Blob 存储的访问类型一致 |

### Cron 频率

`vercel.json` 默认每天 UTC 22:00（北京时间 06:00）运行一次，Hobby 套餐也能部署。Pro 套餐可以改成更高频率，例如每小时 `"0 * * * *"`。Cron 路由设置了 `maxDuration = 300` 秒。

## 改成你的行业

| 文件 | 改什么 |
|---|---|
| `industry/sources.json` | 信源名单与分级（T1 一手 / T2 媒体与个人） |
| `industry/taxonomy.ts` | 站名、分类、启发式关键词 |
| `industry/selection.ts` | 入选门槛、共振窗口与半衰期、聚合相似度 |
| `industry/prompts/` | 评分标准与写作要求 |

## 目录

```
industry/            行业包：信源、分类、门槛、提示词
scripts/pipeline.ts  命令行流水线
src/engine/          引擎：collect 采集、judge 评分写作、cluster 聚合、heat 共振、build 成刊、
                     pipeline 流水线编排、persist 存储（Blob / 本地文件）、store 读取层、seed 示范数据
src/app/             页面与接口（Next.js App Router），api/cron/pipeline 为 Cron 入口
src/components/      界面组件
```

## 检查

```bash
npm run typecheck && npm run lint && npm run build
```
