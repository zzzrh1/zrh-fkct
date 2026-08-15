# 法考错题复盘系统

### 把“做错一道题”变成一条可追踪、可复测、可恢复的学习闭环

错题分析 · 知识图谱标注 · 日/周复盘 · 七日复测 · 学习文档

> **作者：AI法师张诚**  
> 抖音：AI法师张诚，欢迎大家关注；以后会持续更新 AI 法律应用。  
> 🛰️：`ZRHuai-`

<p align="center">
  <img src="https://img.shields.io/badge/领域-法律学习-183B56?style=flat-square" alt="法律学习">
  <img src="https://img.shields.io/badge/流程-分析到复测-2E7D6B?style=flat-square" alt="分析到复测">
  <img src="https://img.shields.io/badge/格式-Markdown%20%7C%20JSON%20%7C%20XMind-CB8B2E?style=flat-square" alt="Markdown JSON XMind">
</p>

<p align="center">
  <img src="./assets/readme/review-loop.svg" width="100%" alt="法考错题复盘从输入、诊断、确认到复测和复盘的学习闭环">
</p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="法考错题复盘系统从错题输入、错因诊断、知识确认到七日复测的学习闭环">
</p>

## 这是什么

这是一个面向法考学习的错题复盘 skill。它不只保存“错了哪道题”，而是把每道错题拆成以下学习闭环；同时支持用户上传自己的 XMind 思维导图进行标注。思维导图输入必须是 `.xmind` 格式，当前仓库只内置民诉示例，其他科目后续更新：

```text
错题输入 → 结构化识别 → 错因诊断 → 知识点确认 → 图谱标注 → 七日复测 → 恢复追踪
```

核心原则：**错题直接整理，知识点先确认、后写入**。未经确认的知识点不会进入知识库（by-knowledge 文件、科目汇集页、图谱标注）。

## 能解决什么

| 模块 | 作用 | 产物 |
| --- | --- | --- |
| 错题诊断 | 从题干、选项、解析中提取知识点，区分知识不会与思路错误 | 结构化错题卡 |
| 知识图谱 | 将直接薄弱点标红，将易混/相邻点标黄 | 标注版图谱 |
| 日复盘 | 汇总当天科目、单元、错因和优先修复点 | 每日 Markdown |
| 周复盘 | 汇总一周错题、错因、高频薄弱点和复测结果 | `02-weekly/YYYY-Www.md` |
| 七日复测 | 到期后记录 `passed`、`failed` 或 `skipped` | 复测队列与日志 |
| 学习文档 | 围绕薄弱点生成前置知识、讲解、易混点和反馈区 | 学习文档 |
| 数据面板 | 从统计真源计算错题数、错因组成和复测通过率 | 指标面板 |

## 快速开始

### 0. 安装后首次使用（必做）

安装 skill 后，首次调用会**引导完成配置**，不直接进入错题录入。需要确认：

1. **Vault**：选择已有 Obsidian Vault 或新建 Vault，确认 `REVIEW_VAULT`。
2. **工作区**：确认 `TECHNICAL_WORKSPACE`（存放临时转换、图谱报告和调试产物）。
3. **科目图谱**：内置民诉图谱仅作 fallback；其他科目需上传 `.xmind` 格式图谱（`SOURCE_XMIND`），不接受 OPML、PDF 或图片。
4. **周复盘方式**：macOS 询问 `on_ingest`（推荐）/ `launchd` / `manual`；非 macOS 默认 `on_ingest`。

选择会保存到 `00-index/skill-config.json`，只询问一次，后续不重复。用户未选择持久化位置时保持预览模式。

### 1. 准备错题输入

根据输入类型，处理方式不同：

| 输入 | 处理 |
| --- | --- |
| 仅错题 | 直接整理入库，**不需要确认**，错题卡带 YAML frontmatter |
| 错题+知识点 | 错题直接整理；单独列出的知识点先确认再写入 |
| 仅错误知识点 | 整理前必须向用户确认知识点和错因，确认后按科目归档 |

可以直接发送完整题目、截图，或粘贴 OCR 文本：

```text
我错了一道题：

【题目】……
【选项】A. …… B. …… C. …… D. ……
【我的答案】A
【正确答案】B
【解析】……
```

也可以只描述混淆点：

```text
我总是分不清管辖权异议和管辖协议。
```

### 2. 确认后写入

**错题直接整理，不需要确认。** 但**任何要写入知识库的知识点**都需要确认——包括单独列出的错误知识点和错题附带的知识点：

1. 实际写入的知识点；
2. 一个错因标签：`1 知识点不会` 或 `2 知识点会但是做题思路不对`。

确认后才写入知识库，并按科目归档到 `04-mistakes/by-knowledge/<科目>/`（民诉的知识点都在 `by-knowledge/民诉/`）。错题本身识别完直接入库，并生成七日复测任务。未确认的知识点不进知识库（不写 by-knowledge、不进科目汇集页、不标图谱），导入输出会列出待确认卡。

### 3. 使用脚本

脚本路径均使用运行时参数，不依赖固定用户名或固定电脑目录。完整路径约定见 [`references/path-configuration.md`](references/path-configuration.md)。

```bash
REVIEW_VAULT="<REVIEW_VAULT>"
TECHNICAL_WORKSPACE="<TECHNICAL_WORKSPACE>"

node scripts/init-review-vault.js "$REVIEW_VAULT"
# 错题直接整理入库（不需要确认）
node scripts/ingest-mistakes.js "$REVIEW_VAULT" "$TECHNICAL_WORKSPACE/recognized-mistakes.json"
# 单独列出的错误知识点：先确认，再入库
node scripts/prepare-knowledge-confirmation.js "$TECHNICAL_WORKSPACE/recognized-knowledge.json" "$TECHNICAL_WORKSPACE/knowledge-confirmation.md"
node scripts/ingest-mistakes.js "$REVIEW_VAULT" "$TECHNICAL_WORKSPACE/confirmed-knowledge.json"
node scripts/metrics-dashboard.js "$REVIEW_VAULT" "$TECHNICAL_WORKSPACE/metrics-dashboard.md"
```

首次使用时，Skill 会先确认 Obsidian Vault，并创建缺失的核心目录。macOS 用户还会首次选择周复盘方式：`on_ingest`（入库后自动更新，推荐）、`launchd`（macOS 定时任务）或 `manual`（手动生成）。选择会保存到 `00-index/skill-config.json`。

如果需要手动生成当前周和上一周周复盘：

```bash
node scripts/generate-weekly-review.js "$REVIEW_VAULT"
```

如果用户选择了 macOS `launchd`，先生成配置；安装 LaunchAgent 需要用户明确选择 `--install`：

```bash
node scripts/configure-automation.js "$REVIEW_VAULT" launchd "$TECHNICAL_WORKSPACE"
node scripts/configure-automation.js "$REVIEW_VAULT" launchd "$TECHNICAL_WORKSPACE" --install
```

## 工作流

### 错题入库

```text
接收图片/文本
    ↓
提取题干、选项、答案、解析
    ↓
诊断表层知识点、根因和易混点
    ↓
写入每日错题卡、统计索引、科目页和复测队列
    ↓
（知识点写入知识库前须经用户确认）
```

### 图谱标注

- 🔴 **红色**：直接薄弱点（知识点不会）。
- 🟡 **黄色**：易混点。
- 基础图谱保持无颜色；标注结果写入独立输出，不污染原始图谱。

入库时自动用**已确认知识点**标注 `03-maps/<科目>/01-base/` 下的 `.xmind` 图谱，输出 `-标注版.xmind` 到 `02-marked/`。未确认知识点不标图谱；该科目没有 `.xmind` 图谱则跳过。

也可手动标注单个 XMind：

```bash
SOURCE_XMIND="<SOURCE_XMIND>"
MARKS_JSON="<MARKS_JSON>"
OUTPUT_XMIND="<OUTPUT_XMIND>"

node scripts/mark-xmind.js "$SOURCE_XMIND" "$MARKS_JSON" "$OUTPUT_XMIND"
```

建议将源文件放在 `03-maps/<科目>/00-source/`，基础图谱放在 `01-base/`，标注输出放在 `02-marked/`。脚本会保留源文件；不传 `OUTPUT_XMIND` 时仍会在源文件同目录生成 `-标注版.xmind`。OPML、PDF 和图片不能作为这一步的思维导图输入。

## 文件结构

```text
00-index/
├── skill-config.json
├── mistake-index.json
└── retest-queue.json
01-daily/YYYY-MM-DD/
├── YYYY-MM-DD.md
├── 1-原始错题素材/
└── 2-整理好的错题/
02-weekly/
03-maps/<科目>/
├── 00-source/
├── 01-base/
└── 02-marked/
04-mistakes/by-subject/<科目>/
04-mistakes/by-cause/<错因>/
04-mistakes/by-knowledge/<科目>/
05-learning-docs/
```

仓库中的示例资料目前只覆盖民诉；其中 `.xmind` 文件可用于思维导图标注演示，Markdown/OPML 仅作导出参考，不会覆盖用户自己的资料。

## 可移植性

这个 skill 面向其他用户复用：

- 不写死用户主目录、桌面目录、Obsidian vault 或备份目录。
- 运行时配置 `REVIEW_VAULT`、`TECHNICAL_WORKSPACE`、`SOURCE_MATERIALS`、`SOURCE_XMIND`、`GRAPH_FILE`、`BACKUP_DIR` 和 `TARGET_VAULT`；周复盘方式保存在 Vault 内的 `00-index/skill-config.json`。
- 周复盘自动化不写死操作系统：`on_ingest` 和 `manual` 可跨平台使用，`launchd` 只在 macOS 用户明确选择后启用。
- 没有指定持久化路径时，默认停留在预览模式或使用宿主提供的临时目录。
- 用户提供的图谱优先；内置公司法图谱仅作为相关科目的 fallback。
- 没有可信题库时，不宣称题库精确匹配。

## 当前边界

- OCR 由 Agent 的视觉能力或外部 OCR 完成，仓库不绑定某个 OCR 服务。
- 自动法律解释需要结合题目证据生成，不把低置信度推断当成事实。
- 复测题可以按要求生成，但不把实验题当作权威题库。
- 日复盘和七日复测是本地文件闭环，不默认连接云端提醒服务。

## License

本仓库当前未附加独立许可证文件。转载、改编或用于其他项目时，请保留作者信息并遵守相关资料的原始授权要求。

<p align="center"><sub>面向真实学习过程设计：记录错误，更重要的是验证恢复。</sub></p>
