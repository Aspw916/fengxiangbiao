import { SELECTION } from "../../industry/selection";
import type { Item, Source } from "./types";
import { hash } from "./text";

// 示范数据：内容为虚构的演示稿件，用于在没有采集和模型时展示版面。
// 时间用"几小时前"表示，加载时按当前时间换算，所以"今天"永远有内容。
type Row = [eventKey: string, sourceId: string, hoursAgo: number, title: string, summary: string, reason: string, category: string, s1: number, s2: number];

const ROWS: Row[] = [
  ["agent-sdk", "openai", 3, "OpenAI 开放智能体运行时，开发者可直接托管长任务", "OpenAI 发布可托管的智能体运行时，支持任务中断恢复、工具调用审计和按步计费。开发者不必再自己搭队列与状态存储。", "做 Agent 产品的团队可以少写一层基础设施，计费方式也会影响成本模型。", "product", 86, 82],
  ["agent-sdk", "verge", 2.5, "OpenAI 想让智能体像云函数一样被部署", "The Verge 解读称，新运行时把智能体从演示推向生产，重点在可观测性和权限隔离。", "", "product", 74, 70],
  ["agent-sdk", "techcrunch", 2, "OpenAI 智能体运行时定价公布：按步计费、空闲不收费", "TechCrunch 获得的定价表显示，每一步工具调用单独计费，挂起状态不产生费用。", "", "industry", 71, 69],
  ["agent-sdk", "simonw", 1.2, "上手体验：用 OpenAI 新运行时跑一个三小时的抓取任务", "作者实测中断恢复可用，但日志检索仍然粗糙；建议先在非关键任务上试用。", "", "tooling", 72, 75],
  ["agent-sdk", "latentspace", 0.8, "智能体运行时之争开始：托管、自建还是混合？", "播客嘉宾讨论托管运行时对开源框架的冲击，认为状态管理会成为新的锁定点。", "", "opinion", 66, 64],

  ["open-weights", "huggingface", 6, "Hugging Face 上线 120B 开源权重模型，许可允许商用", "新模型以宽松许可发布，在代码与长文档任务上接近主流闭源模型，并提供 4 位量化版本。", "本地部署和私有化的选择又多了一个能打的。", "model", 84, 80],
  ["open-weights", "decoder", 5, "开源 120B 模型跑分接近闭源旗舰，推理成本约为三分之一", "The Decoder 汇总第三方评测：长上下文检索稳定，数学推理仍有差距。", "", "model", 73, 71],
  ["open-weights", "arstechnica", 4.5, "一张消费级显卡能跑吗？开源 120B 模型的量化实测", "Ars Technica 在 48GB 显存上跑通 4 位量化版，每秒约 18 个 token。", "", "tooling", 70, 68],
  ["open-weights", "nvidia", 4, "NVIDIA 为新开源 120B 模型提供首日推理优化", "NVIDIA 发布对应的推理容器，宣称在其数据中心显卡上吞吐提升约 2 倍。", "", "product", 68, 66],

  ["eu-act", "mittr", 9, "欧盟通用模型行为准则落地，首批签署企业名单公布", "准则要求披露训练数据摘要与安全评估流程，未签署企业需单独证明合规。", "出海产品的合规节奏要重新排。", "industry", 78, 76],
  ["eu-act", "verge", 8, "哪些公司签了欧盟 AI 准则，哪些没有", "多家大厂签署，部分初创公司表示文书成本过高，正在观望。", "", "industry", 69, 72],
  ["eu-act", "techcrunch", 7, "欧盟 AI 准则对开源模型网开一面，但有条件", "开源权重模型可豁免部分披露义务，但超过算力阈值的仍需提交评估报告。", "", "industry", 70, 68],

  ["deepmind-robot", "deepmind", 11, "DeepMind 展示通用机器人策略：一个模型完成 40 类家务", "新策略模型在未见过的厨房中完成整理、开柜和简单烹饪，成功率较上一代提高明显。", "具身智能从单任务演示走向通用策略的一个节点。", "research", 82, 79],
  ["deepmind-robot", "arstechnica", 10, "看懂 DeepMind 新机器人论文：数据从哪来、局限在哪", "数据主要来自远程操控采集与仿真，作者承认在柔性物体上仍频繁失败。", "", "research", 70, 66],

  ["copilot-review", "github", 14, "GitHub Copilot 代码审查全面开放，支持自定义审查规则", "团队可以用自然语言写审查规则，Copilot 会在 PR 中逐条标注并给出修改建议。", "代码审查流程可以直接接入，不用等内测。", "product", 76, 73],
  ["copilot-review", "simonw", 12, "让 Copilot 审查我的旧项目：有用的建议和离谱的建议", "作者记录了 30 条建议，约一半可直接采纳，另有几条误解了项目约定。", "", "tooling", 68, 70],

  ["chip-funding", "techcrunch", 18, "推理芯片初创公司完成 6 亿美元融资，估值翻倍", "公司称其专用推理芯片在长上下文场景下单位成本更低，新资金用于扩大量产。", "推理成本下降的另一条路线正在被资本押注。", "industry", 74, 70],
  ["chip-funding", "decoder", 16, "推理芯片融资潮：今年已有五家公司估值超 30 亿美元", "文章梳理了推理专用芯片赛道的融资节奏与客户结构。", "", "industry", 64, 66],

  ["msr-memory", "msr", 20, "微软研究院提出长期记忆基准，测出主流模型的\"遗忘曲线\"", "新基准模拟数周的连续对话，发现多数模型在 10 万 token 后对早期事实的回忆明显下降。", "做长期陪伴、助理类产品的团队可以直接拿来测。", "research", 77, 74],

  ["bair-eval", "bair", 23, "伯克利：模型自评分数与人类偏好的相关性比想象中低", "研究对比了 12 个模型的自评与人类评审，发现在开放式写作任务上相关性不足 0.4。", "", "research", 66, 63],

  ["hf-smol", "huggingface", 27, "Hugging Face 开源 1.7B 小模型训练全流程与数据配方", "公开了数据清洗脚本、训练日志和消融实验，复现成本约为数千美元。", "想自己训小模型的团队可以照着做。", "tooling", 75, 72],
  ["hf-smol", "latentspace", 25, "小模型的春天？对话 Hugging Face 训练团队", "嘉宾认为数据质量比参数量更关键，端侧场景会率先受益。", "", "opinion", 63, 61],

  ["voice-mode", "openai", 30, "ChatGPT 语音模式支持实时翻译，覆盖 30 种语言", "用户可以在语音对话中让 ChatGPT 担任同声传译，延迟约为一秒。", "", "product", 72, 70],
  ["voice-mode", "verge", 29, "实测 ChatGPT 实时翻译：日常够用，专业术语仍会卡壳", "记者在餐厅、出租车等场景测试，日常对话准确，医学术语错误较多。", "", "product", 64, 66],

  ["nvidia-sim", "nvidia", 34, "NVIDIA 发布机器人仿真数据集，含 100 万段操作轨迹", "数据集覆盖抓取、装配与移动任务，以开放许可提供研究使用。", "", "research", 68, 64],

  ["ai-search-traffic", "mittr", 40, "AI 搜索摘要上线一年后，新闻网站流量下降了多少", "多家出版商数据显示，搜索导流平均下降 25%，长尾内容受影响最大。", "做内容和 SEO 的人需要正视的变化。", "industry", 73, 71],
  ["ai-search-traffic", "arstechnica", 38, "出版商开始向 AI 搜索收费，谈判进展如何", "部分出版商已签署授权协议，另一些选择屏蔽抓取。", "", "industry", 66, 64],

  ["prompt-cache", "simonw", 44, "提示词缓存省钱实战：把系统提示词拆成三层", "作者分享了按变化频率拆分提示词的方法，在自己的项目里把调用成本降低约 60%。", "照着就能做的降本技巧。", "tooling", 74, 76],

  ["gemini-sheets", "deepmind", 50, "Gemini 接入表格工具，可以直接生成数据透视和图表", "用户用自然语言描述分析需求，Gemini 生成公式、透视表和图表草稿。", "", "product", 70, 68],
  ["gemini-sheets", "decoder", 48, "办公套件里的 AI 助手，谁做得更好用？", "横向对比三家办公套件的表格助手，在公式正确率上差距明显。", "", "product", 62, 65],

  ["lawsuit", "verge", 56, "作家集体诉讼进入证据开示阶段，训练数据来源成焦点", "法院要求被告提交部分训练数据清单，案件可能影响后续授权谈判。", "", "industry", 71, 69],
  ["lawsuit", "mittr", 54, "训练数据诉讼一览：哪些已和解，哪些还在打", "文章整理了 14 起相关诉讼的当前状态。", "", "industry", 63, 61],

  ["agents-essay", "latentspace", 62, "为什么 2026 年的智能体还是不够可靠", "作者认为问题不在模型能力，而在任务规格不清与缺少回滚机制。", "", "opinion", 64, 62],
  ["gh-actions", "github", 66, "GitHub Actions 新增模型调用步骤，可在流水线里跑评测", "工作流中可以直接调用模型并把结果写进检查报告。", "", "tooling", 67, 65],
  ["robot-startup", "techcrunch", 68, "家用机器人初创公司开启预订，售价 1.9 万美元", "首批产品主打整理与清洁，公司称将通过远程协助弥补自主能力不足。", "", "industry", 58, 62],
];

export function seedItems(sources: Source[], at = Date.now()): Item[] {
  const tierOf = new Map(sources.map((s) => [s.id, s.tier]));
  return ROWS.map(([eventKey, sourceId, hoursAgo, title, summary, reason, category, s1, s2]) => {
    const score = Math.round((s1 + s2) / 2);
    const tier = tierOf.get(sourceId) ?? "T2";
    const id = hash(`${eventKey}-${sourceId}-${title}`);
    return {
      id,
      sourceId,
      url: `${sources.find((s) => s.id === sourceId)?.homepage ?? "https://example.com"}#demo-${id}`,
      originalTitle: title,
      title,
      summary,
      reason,
      category,
      publishedAt: new Date(at - hoursAgo * 3600_000).toISOString(),
      scores: [s1, s2] as [number, number],
      score,
      selected: score >= (SELECTION.thresholds[tier] ?? 101),
      eventId: "",
      eventKey,
    };
  });
}
